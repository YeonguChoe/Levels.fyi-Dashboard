class Circles {

  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data) {
      //  defaults configuration for the packed-circles class
      this.config = {
          parentElement: _config.parentElement,
          containerWidth: _config.containerWidth || 350,
          containerHeight: _config.containerHeight || 350,
          filterVal: _config.tooltipPadding || 'all',
          margin: _config.margin || {
              top: 115,
              right: 0,
              bottom: 0,
              left: 0
          },
          tooltipPadding: _config.tooltipPadding || 15
      }
      this.clickedCompany = ""
      this.filterVal = 0;
      this.data = _data;
      this.initVis();
  }


  initVis() {
      let vis = this;

      vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
      vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
      
      // initialize svg area
      vis.svg = d3.select("#packed-circles")
        .append("svg")
          .attr("width", vis.width)
          .attr("height", vis.height)

      // sclae for the x position of each circle group
      vis.x = d3.scaleOrdinal()
        .domain(["a", "b", "c", "d"])
        .range([0.25*vis.width, 0.75*vis.width, 0.25*vis.width, 0.75*vis.width]);

      // sclae for the y position of each circle group
      vis.y = d3.scaleOrdinal()
        .domain(["a", "b", "c", "d"])
        .range([0.25*vis.height, 0.25*vis.height, 0.75*vis.height, 0.75*vis.height]);

      // color sclae for each circle group
      vis.color = d3.scaleOrdinal()
        .domain(["a", "b", "c", "d"])
        .range([d3.schemeSet1[0], d3.schemeSet1[1], d3.schemeSet1[2], d3.schemeSet1[5]]);

      // radius scale for each circle size 
      vis.radius = d3.scaleLinear()
        .domain([0, 500000])
        .range([0.1,16]) 

      vis.nodeContainer = vis.svg.append('g').attr('class', `nodeContainer`)

      // add text explanation about what the circle size represents
      vis.nodeContainer.append('text')
        .attr('class', 'axis-title')
        .attr('y', vis.height - 10)
        .attr('x', vis.width / 2)
        .attr('dy', '.71em')
        .style('text-anchor', 'middle')
        .text('The size of each circle is based on the average compensation.')
        .attr('font-size', '12px')
  }


  updateVis() {
      let vis = this;

      // set the appropriate seclected company variable for the treemap
      if (selectedCompany !== "") {
        prevSelectedCompany = selectedCompany;
      }

      // handles inconsistancy in the naming of the company
      vis.groupedByCompany = d3.groups(vis.data, d => toTitleCase(d.company.trim()));
      // filter only the companies that have at least 10 data
      vis.companiesMoreThanTenData = vis.groupedByCompany.filter(c => c[1].length >= 10);

      // data filtering and transformation logic from the original data to the format that can be processed 
      vis.contains_all = []
      for (const comp of vis.companiesMoreThanTenData) {
        // extract individual informations and construct the new data type 
        let individual = {};
        individual.company = comp[0];
        individual.company_no_space = comp[0].replace(/\s/g, '').replace('.','');
        individual.len = comp[1].length;
        individual.compensation_sum = 0
        individual.male_count = 0
        individual.locations = []
        for (const each of comp[1]) {
          individual.compensation_sum = individual.compensation_sum + each.compensation;
          if (each.gender === "Male") {
            individual.male_count += 1;
          }
          if (!(individual.locations.includes(each.state))) {
            individual.locations.push(each.state)
          }
        }

        // add classification of each circle by gender ratio
        individual.avg_compensation = Math.ceil(individual.compensation_sum / individual.len);
        individual.gender_ratio = +(individual.male_count / individual.len).toFixed(2);
        if (0 <= individual.gender_ratio && individual.gender_ratio <= 0.40) {
          individual.classification = 'a';
        } else if (0.40 < individual.gender_ratio && individual.gender_ratio <= 0.50) {
          individual.classification = 'b';
        } else if (0.50 < individual.gender_ratio && individual.gender_ratio <= 0.60) {
          individual.classification = 'c';
        }  else {
          individual.classification = 'd';
        }
        
        vis.contains_all.push({...individual})
        vis.ultimate = [...vis.contains_all].filter(d => d.avg_compensation >= this.filterVal);
      }
      vis.renderVis();
  }


  renderVis() {
      let vis = this;

      // add circles
      let node = vis.nodeContainer.selectAll(".node")
          .data(vis.ultimate, d => d.company)
        .join("circle")
          .attr("class", "node")
          .attr("id", d => d.company_no_space)
          .attr("r", d => vis.radius(d.avg_compensation))
          .attr("cx", vis.width / 2)
          .attr("cy", vis.height / 2)
          .style("fill", d => vis.color(d.classification))
          .style("fill-opacity", 0.7)
          .attr("stroke", "black")
          .style("stroke-width", 1)
          .call(d3.drag() 
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));

      // keep the previous circle selection when 
      let company = selectedCompany.replace(/\s/g, '').replace('.','');
      if (selectedCompany !== "") {
          d3.select(`#${company}`).style('active', true)
          d3.select(`#${company}`).style("fill-opacity", 1.0)
          d3.select(`#${company}`).style("stroke-width", 1.5)
      }

      // function for finding states of the company
      let states_for_curr_company;
      let find_states = (a, key) => {
          for (const match of a) {
              if (match.company === key) {
                  return match.locations;
              }
          }
          return null;
      }

      node
        .on('mouseover', (event,d) => {
            // implementation for link from circle to the US map
            states_for_curr_company = find_states(locationsPerCompany, d.company);
            for (const state of states_for_curr_company) {
              d3.select(`#${state}`).style("stroke-width", 3)
              d3.select(`#${state}`).style("stroke", "red")
            }

            // implementation for tooltip of each circle
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding - 120) + 'px')
              .html(`
                  <div class="tooltip-title">${d.company}</div>
                  <div><i>Locations: ${d.locations}</i></div>
                  <ul>
                    <li>Average Compensation: $${d.avg_compensation}</li>
                    <li>Gender Ratio: ${d.gender_ratio} (Male / All Genders)</li>
                  </ul>
                  `);
            })
        .on('mouseleave', (event,d) => {
            // implementation for link from circle to the US map
            states_for_curr_company = find_states(locationsPerCompany, d.company);
            for (const state of states_for_curr_company) {
              d3.select(`#${state}`).style("stroke-width", 1)
              d3.select(`#${state}`).style("stroke", "black")
            }
            d3.select('#tooltip').style('display', 'none');
            })
        .on('click', function(event,d)  {
          // circle selection logic for the link from circle to treemap
          let currCompany = selectedCompany.replace(/\s/g, '').replace('.','');
          if (currCompany === String(d.company).replace(/\s/g, '').replace('.','')) {  // already selected
            this.clickedCompany = ""
            if (selectedCompany !== "") {
              prevSelectedCompany = selectedCompany;
            }
            selectedCompany = ""
            d3.select(this).classed('active', false)
            d3.select(this).style("fill-opacity", 0.7)
            d3.select(this).style("stroke-width", 1)
          } else if (currCompany === "") {
            this.clickedCompany = String(d.company).replace(/\s/g, '').replace('.','')
            if (selectedCompany !== "") {
              prevSelectedCompany = selectedCompany;
            }
            selectedCompany = String(d.company)
            d3.select(this).classed('active', true)
            d3.select(this).style("fill-opacity", 1.0)
            d3.select(this).style("stroke-width", 1.5)
          } else {  
            // if currCompany !== d.company, then other company is currently selected for treemap
            this.clickedCompany = String(d.company).replace(/\s/g, '').replace('.','')
            if (selectedCompany !== "") {
              prevSelectedCompany = selectedCompany;
            }
            selectedCompany = String(d.company)
            d3.select(`#${currCompany}`).style('active', false)
            d3.select(`#${currCompany}`).style("fill-opacity", 0.7)
            d3.select(`#${currCompany}`).style("stroke-width", 1)
            d3.select(this).classed('active', true)
            d3.select(this).style("fill-opacity", 1.0)
            d3.select(this).style("stroke-width", 1.5)
          }
          treeMap.updateVis();
        })
        
      // logic for applying force to each circle
      const simulation = d3.forceSimulation()
          .force("x", d3.forceX().strength(0.1).x(d => vis.x(d.classification)))
          .force("y", d3.forceY().strength(0.1).y(d => vis.y(d.classification)))
          .force("center", d3.forceCenter().x(vis.width / 2).y(vis.height / 2)) 
          .force("charge", d3.forceManyBody().strength(.8)) 
          .force("collide", d3.forceCollide().strength(1).radius(function(d){ return (vis.radius(d.avg_compensation)+1) }).iterations(3)) 

      // update the position based on the force applied
      simulation
          .nodes(vis.ultimate)
          .on("tick", function(d){
            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
          });

      // logic for handling circle movement
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(.03).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(.03);
        d.fx = null;
        d.fy = null;
      }
  }
}