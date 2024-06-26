class BeeSwarm {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1024,
            containerHeight: _config.containerHeight || 250,
            tooltipPadding: 25,
            margin: { top: 15, right: 50, bottom: 50, left: 50 },
        }
        this.data = _data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Setting up the vis width and height, regarding the margins
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Appending an svg element to the parent
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // xScale is for average compensation of company
        vis.xScale = d3.scaleLinear()
            .range([0, vis.width]);

        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(10)
            .tickSizeOuter(0);

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`);

        // Adding the title
        vis.chart.append('text')
            .attr('class', 'title')
            .attr('y', 25)
            .attr('x', 0)
            .attr('font-size', '22px')
            .attr('font-weight', 'bold')
            .style('text-anchor', 'start')
            .text('View5: Company Information');

        // Adding x axis label
        vis.chart.append('text')
            .attr('class', 'axis-title')
            .attr('y', vis.height + 30)
            .attr('x', vis.width + 10)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text('Average Compensation (USD)')

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        vis.xValue = d => d.avgTotalCompensation;

        // Setting the xScale domain from 0 to max avg compensation of company
        vis.xScale.domain([0, d3.max(vis.data, d => vis.xValue(d))])

        vis.renderVis();
    }

    renderVis() {
        let vis = this;
        // padding between circles
        const padding = 3;
        // radius of each circle
        const radius = 4.5;

        const circle = vis.chart.selectAll('.circle')
            // Using the dodge function to space individual circles
            .data(dodge(vis.data, {
                radius: radius * 2 + padding,
                x: d => vis.xScale(vis.xValue(d))
            })).join("circle")
            .attr("cx", d => d.x)
            /**
             * positioning the circle, d.y is generated by dodge function
             * pushing the circles up by radius and padding to position them
             * above the xAxis
             */
            .attr("cy", d => vis.height - radius - padding - d.y)
            .attr("r", radius)
            .attr("fill", "#90ee90")

        circle.on('mouseover', (event, d) => {
            // Rendering a tooltip when hovered
            d3.select('#tooltip')
                .style('display', 'block')
                .style('left', (event.pageX + (vis.config.tooltipPadding / 2)) + 'px')
                .style('top', (event.pageY - vis.config.tooltipPadding) + 'px')
                .html(`
                <h1><b>${d.data.name}</b></h1>
                <p><i>Avg. Total Compensation:</i> $${d.data.avgTotalCompensation}</p>
                `);
        }).on('mouseleave', () => {
            // Removing the tooltip display when mouse leaves
            d3.select('#tooltip').style('display', 'none');
        })

        // Render the xAxis
        vis.xAxisG.call(vis.xAxis);
    }
}

// from: https://observablehq.com/@d3/beeswarm/2
function dodge(data, { radius, x }) {
    const radius2 = radius ** 2;
    const circles = data.map((d, i, data) => ({ x: +x(d, i, data), data: d })).sort((a, b) => a.x - b.x);
    const epsilon = 1e-3;
    let head = null, tail = null;

    // Returns true if circle ⟨x,y⟩ intersects with any circle in the queue.
    function intersects(x, y) {
        let a = head;
        while (a) {
            if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) {
                return true;
            }
            a = a.next;
        }
        return false;
    }

    // Place each circle sequentially.
    for (const b of circles) {

        // Remove circles from the queue that can’t intersect the new circle b.
        while (head && head.x < b.x - radius2) head = head.next;

        // Choose the minimum non-intersecting tangent.
        if (intersects(b.x, b.y = 0)) {
            let a = head;
            b.y = Infinity;
            do {
                let y = a.y + Math.sqrt(radius2 - (a.x - b.x) ** 2);
                if (y < b.y && !intersects(b.x, y)) b.y = y;
                a = a.next;
            } while (a);
        }

        // Add b to the queue.
        b.next = null;
        if (head === null) head = tail = b;
        else tail = tail.next = b;
    }

    return circles;
}