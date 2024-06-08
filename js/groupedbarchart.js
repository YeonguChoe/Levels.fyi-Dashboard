class Groupedbarchart {
    constructor(_config, _data) {

        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth,
            containerHeight: _config.containerHeight,
            margin: _config.margin || {
                top: 50,
                right: 5,
                bottom: 40,
                left: 60
            }
        }
        this.data = _data;
        this.data.sort((a, b) => d3.ascending(a.average_salary, b.average_salary));
        this.initVis();
    }


    initVis() {
        let vis = this;

        // Setting up the vis width and height
        // removing margins fixed the sizing of the visualization
        vis.width = vis.config.containerWidth - vis.config.margin.right;
        vis.height = vis.config.containerHeight;

        vis.xScale0 = d3.scaleBand()
            .range([0, vis.width - vis.config.margin.left - vis.config.margin.right])
            .padding(0.2);
        vis.xScale1 = d3.scaleBand();
        vis.yScale = d3.scaleLinear()
            .range([vis.height - vis.config.margin.top - vis.config.margin.bottom, 0]);

        // Setting up the axis
        vis.xAxis = d3.axisBottom(vis.xScale0)
        vis.yAxis = d3.axisLeft(vis.yScale)
            .ticks(6)
            .tickFormat(d3.format(".0s"));

        // Setting up the svg area
        vis.svg = d3.select(vis.config.parentElement).append("svg")
            .attr('width', vis.width)
            .attr('height', vis.height);

        // Setting up the chart area
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Title text
        vis.svg.append("text")
            .attr("x", 0)
            .attr("y", (vis.config.margin.top / 2))
            .style("font-size", "22px")
            .style("font-weight", "bold")
            .text("View4: Cost of Living by State");

        // X axis label
        vis.svg.append("text")
            .attr("transform",
                "translate(" + (vis.width / 2) + " ," +
                (vis.height) + ")")
            .style("text-anchor", "middle")
            .text("State");

        // Y axis label
        vis.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0)
            .attr("x", 0 - (vis.height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("USD");

        // Legend group
        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(" + (vis.config.margin.left * 1.4) + "," + (vis.config.margin.top * 1.4) + ")");

        // Circle for average salary legend
        vis.legend.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 6)
            .style("fill", "green")

        // Text for average salary legend
        vis.legend.append("text")
            .attr("x", 20)
            .attr("y", 0)
            .text("Average Salary")
            .style("font-size", "15px")
            .attr("alignment-baseline", "middle");

        // Circle for cost of living legend
        vis.legend.append("circle")
            .attr("cx", 0)
            .attr("cy", 20)
            .attr("r", 6)
            .style("fill", "red");

        // Text for cost of living legend
        vis.legend.append("text")
            .attr("x", 20)
            .attr("y", 20)
            .text("Cost of Living")
            .style("font-size", "15px")
            .attr("alignment-baseline", "middle");


        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr("transform", `translate(0,${vis.height - vis.config.margin.top - vis.config.margin.bottom})`);

        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');
    }

    updateVis() {

        let vis = this;

        // remove all existing bars
        vis.chart.selectAll(".state").remove();

        vis.x0Value = function (d) { return d.state };

        vis.xScale0.domain(vis.data.map(vis.x0Value));
        vis.xScale1.domain(['average_salary', 'cost_of_living'])
            .range([0, vis.xScale0.bandwidth()]);
        vis.yScale.domain([0, 300000]);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        // make a pair of bars for each state
        vis.barpair = vis.chart.selectAll(".state")
            .data(vis.data)
            .enter().append("g")
            .attr("class", "state")
            .attr("transform", d => `translate(${vis.xScale0(d.state)},0)`);

        // add rectangle for cost of living
        vis.costbar = vis.barpair.selectAll(".bar.cost_of_living")
            .data(d => [d])
            .enter()
            .append("rect")
            .attr("class", "bar cost_of_living")
            .style("fill", d => statesSelected.includes(d.state) ? "black" : "red")
            .attr("x", d => vis.xScale1('cost_of_living'))
            .attr("y", d => vis.yScale(d.cost_of_living))
            .attr("width", vis.xScale1.bandwidth())
            .attr("height", d => {
                return vis.height - vis.config.margin.top - vis.config.margin.bottom - vis.yScale(d.cost_of_living)
            });

        // add rectangle for average salary
        vis.salarybar = vis.barpair.selectAll(".bar.average_salary")
            .data(d => [d])
            .enter()
            .append("rect")
            .attr("class", "bar average_salary")
            .style("fill", d => statesSelected.includes(d.state) ? "black" : "green")
            .attr("x", d => vis.xScale1('average_salary'))
            .attr("y", d => vis.yScale(d.average_salary))
            .attr("width", vis.xScale1.bandwidth())
            .attr("height", d => {
                return vis.height - vis.config.margin.top - vis.config.margin.bottom - vis.yScale(d.average_salary)
            });

        // update axis groups
        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);

        ///////////////////////////////////////Tooltip/////////////////////////////////////////
        // Tooltip for cost of living bar
        vis.costbar
            .on('mouseover', (event, d) => {
                let tooltip_width = 60;
                let tooltip_height = 10;

                let svg = d3.select('#tooltipY')
                    .style('opacity', 1)
                    .style('display', 'block')
                    .style('background-color', 'red')
                    .append('svg')
                    .attr('width', tooltip_width)
                    .attr('height', tooltip_height);

                // text
                svg.append('text')
                    .attr('x', tooltip_width / 2)
                    .attr('y', tooltip_height)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .text(d.cost_of_living + ' USD');
            })
            .on('mousemove', (event) => {
                d3.select('#tooltipY')
                    .style('left', (event.pageX) + 'px')
                    .style('top', (event.pageY + 30) + 'px')
            })
            .on('mouseleave', () => {
                d3.select('#tooltipY').selectAll('*').remove();
                d3.select('#tooltipY')
                    .style('opacity', 0)
                    .style('background-color', 'white')
                    .style('display', 'none');
            });

        // Tooltip for average salary bar
        vis.salarybar
            .on('mouseover', (event, d) => {
                let tooltip_width = 60;
                let tooltip_height = 10;

                let svg = d3.select('#tooltipY')
                    .style('opacity', 1)
                    .style('display', 'block')
                    .style('background-color', 'green')
                    .append('svg')
                    .attr('width', tooltip_width)
                    .attr('height', tooltip_height);

                // text
                svg.append('text')
                    .attr('x', tooltip_width / 2)
                    .attr('y', tooltip_height)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .text(d.average_salary + ' USD');
            })
            .on('mousemove', (event) => {
                d3.select('#tooltipY')
                    .style('left', (event.pageX) + 'px')
                    .style('top', (event.pageY + 30) + 'px')
            })
            .on('mouseleave', () => {
                d3.select('#tooltipY').selectAll('*').remove();
                d3.select('#tooltipY')
                    .style('opacity', 0)
                    .style('background-color', 'white')
                    .style('display', 'none');
            });

        // Clicking bar will change USA map
        // if cost of living bar is clicked, add state to statesSelected and render the map
        vis.costbar
            .on('click', (event, d) => {
                if (statesSelected.includes(d.state)) {
                    statesSelected.splice(statesSelected.indexOf(d.state), 1);
                } else {
                    statesSelected.push(d.state);
                }
                // remove text from tooltip
                d3.select('#tooltipY').selectAll('*').remove();

                vis.updateVis();
                usaMap.updateVis();
            });

        // if salary bar is clicked, add state to statesSelected and render the map
        vis.salarybar
            .on('click', (event, d) => {
                if (statesSelected.includes(d.state)) {
                    statesSelected.splice(statesSelected.indexOf(d.state), 1);
                } else {
                    statesSelected.push(d.state);
                }
                // remove text from tooltip
                d3.select('#tooltipY').selectAll('*').remove();

                vis.updateVis();
                usaMap.updateVis();
            });
    }
}