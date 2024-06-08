class TreeMap {

    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1000,
            containerHeight: _config.containerHeight || 500,
            margin: _config.margin || {
                top: 50,
                right: 5,
                bottom: 0,
                left: 5
            },
            tooltipPadding: 15
        }
        this.originalData = _data;
        this.data = JSON.parse(JSON.stringify(this.originalData));
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Setting up the vis width and height
        // removing top margin fixed the sizing of the visualization
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.bottom;

        vis.colorScale = d3.scaleOrdinal()
            .domain(["Tech Jobs", "Non-Tech Jobs"])
            .range(["blue", "red"])

        vis.svg = d3.select(vis.config.parentElement)
            .append("svg")
            .attr("width", vis.width)
            .attr("height", vis.height);



        // title
        vis.svg.append('text')
            .attr('class', 'treemap-title')
            .attr('x', vis.config.margin.left)
            .attr('y', vis.config.margin.top / 2)
            .attr('font-size', '22px')
            .style('font-weight', 'bold')
            .text('View3: Average Compensation of Jobs at ' + prevSelectedCompany)

        // legend group
        vis.legend = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left + vis.width / 3},${0})`);

        // square for legend
        vis.legend.append('rect')
            .attr('x', vis.config.margin.left + 300)
            .attr('y', vis.config.margin.top / 2 - 10)
            .attr('width', 10)
            .attr('height', 10)
            .style('fill', 'blue')

        // text for legend
        vis.legend.append('text')
            .attr('x', vis.config.margin.left + 315)
            .attr('y', vis.config.margin.top / 2)
            .attr('font-size', '10px')
            .text('Tech Jobs')

        // square for legend
        vis.legend.append('rect')
            .attr('x', vis.config.margin.left + 300)
            .attr('y', vis.config.margin.top / 2 + 10)
            .attr('width', 10)
            .attr('height', 10)
            .style('fill', 'red')

        // text for legend
        vis.legend.append('text')
            .attr('x', vis.config.margin.left + 315)
            .attr('y', vis.config.margin.top / 2 + 20)
            .attr('font-size', '10px')
            .text('Non-Tech Jobs')

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);
    }

    updateVis() {
        let vis = this;

        // remove all previous items before render
        vis.chart.selectAll('*').remove();

        vis.data = JSON.parse(JSON.stringify(vis.originalData));
        vis.toBeSelected = selectedCompany === "" ? prevSelectedCompany : selectedCompany;
        vis.data = vis.data.filter(a => toTitleCase(a.company.trim()) == vis.toBeSelected)
        vis.colorScale.domain(["Tech Jobs", "Non-Tech Jobs"]);

        // update title when selected company changes
        vis.svg.select('.treemap-title')
            .text('View3: Position distribution @ ' + vis.toBeSelected)

        // set list of technical jobs
        let tech_positions = ['Solution Architect', 'Software Engineer', 'Software Engineering Manager', 'Technical Program Manager', 'Hardware Engineer', 'Mechanical Engineer', 'Data Scientist'];

        vis.tech_jobs = vis.data.filter(d => tech_positions.includes(d.title))
        vis.non_tech_jobs = vis.data.filter(d => !tech_positions.includes(d.title))

        vis.tech_job_means = d3.rollups(vis.tech_jobs, v => d3.mean(v, d => d.compensation), d => d.title);
        vis.non_tech_job_means = d3.rollups(vis.non_tech_jobs, v => d3.mean(v, d => d.compensation), d => d.title);

        // make data structure for tree map
        let data = {
            "children": [{
                "name": "Tech Jobs",
                "children": vis.tech_job_means
            },
            {
                "name": "Non-Tech Jobs",
                "children": vis.non_tech_job_means

            }]
        }


        // make hierarchy for tree map
        vis.hierarchy = d3.hierarchy(data).sum(d => {
            return d[1]
        });


        vis.renderVis();
    }

    renderVis() {

        let vis = this;

        // initialize treemap
        vis.treemap = d3.treemap()
            .size([vis.width - vis.config.margin.left - vis.config.margin.right, vis.height - vis.config.margin.top - vis.config.margin.bottom])
            .paddingInner(5)(vis.hierarchy);

        // make cells
        vis.cells = vis.chart.selectAll(".cells")
            .data(vis.hierarchy.leaves())
            .enter()
            .append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('width', d => (d.x1 - d.x0))
            .attr('height', d => (d.y1 - d.y0))
            .style('stroke', 'white')
            .style('fill', d => vis.colorScale(d.parent.data.name))

        // Mask for each cell
        vis.chart.selectAll(".cells")
            .data(vis.hierarchy.leaves())
            .enter()
            .append("mask")
            .attr("id", (d, i) => `mask-${i}`)
            .append("rect")
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr("width", d => (d.x1 - d.x0))
            .attr("height", d => (d.y1 - d.y0))
            .attr("fill", "white");

        // Cell text 1 (the first word of job title)
        vis.chart.selectAll(".cells")
            .data(vis.hierarchy.leaves())
            .enter()
            .append("text")
            .attr("x", d => d.x0 + 5)
            .attr("y", d => d.y0 + 15)
            .text(d => {
                let words = String(d.data[0]).split(' ');
                return words[0]
            })
            .attr("font-size", "10px")
            .attr("fill", "white")
            .attr("font-weight", "bold")

        // Cell text 2 (the second word of job title)
        vis.chart.selectAll(".cells")
            .data(vis.hierarchy.leaves())
            .enter()
            .append("text")
            .attr("x", d => d.x0 + 5)
            .attr("y", d => d.y0 + 30)
            .text(d => {
                let words = String(d.data[0]).split(' ');
                return words[1]
            })
            .attr("font-size", "10px")
            .attr("fill", "white")
            .attr("font-weight", "bold")

        // Cell text 3 (the third word of job title)
        vis.chart.selectAll(".cells")
            .data(vis.hierarchy.leaves())
            .enter()
            .append("text")
            .attr("x", d => d.x0 + 5)
            .attr("y", d => d.y0 + 45)
            .text(d => {
                let words = String(d.data[0]).split(' ');
                return words[2]
            })
            .attr("font-size", "10px")
            .attr("fill", "white")
            .attr("font-weight", "bold")


        // Cell text 4 (mean compensation)
        vis.chart.selectAll(".cells")
            .data(vis.hierarchy.leaves())
            .enter()
            .append("text")
            .attr("x", d => d.x0 + 5)
            .attr("y", d => d.y0 + (d.y1 - d.y0) - 10)
            .text(function (d) {
                return parseInt(d.data[1]) + ' USD'
            })
            .attr("font-size", "10px")
            .attr("fill", "white")
            .attr("font-weight", "bold");


        // Tool tip
        vis.cells.on('mouseover', (event, d) => {
            let width = 200;
            let height = 50;

            let tooltip = d3.select('#tooltipY')
                .style('opacity', 1)
                .style('display', 'block')
                .style('width', width)
                .style('height', height)

            // append title to tooltip
            tooltip
                .html(`
                    <h1>${d.data[0]}</h1>
                    <p>${Math.floor(d.data[1]) + ' USD'}</p>
                    `)
                .style("font-size", "15px")
                .style("font-weight", "bold");

        })
            .on('mousemove', (event) => {
                d3.select('#tooltipY')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY - 50) + 'px')
            })
            .on('mouseleave', () => {
                d3.select('#tooltipY').selectAll('*').remove();
                d3.select('#tooltipY')
                    .style('opacity', 0)
                    .style('display', 'none');
            });
    }
}