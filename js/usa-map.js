class USAMap {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 960,
            containerHeight: _config.containerHeight || 500,
            tooltipPadding: 10,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            legendRectHeight: Math.min(25, _config.containerHeight * 0.05),
            legendRectWidth: Math.min(300, _config.containerWidth * 0.5)
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

        vis.svg.append('text')
            .attr('class', 'treemap-title')
            .attr('x', 10)
            .attr('y', 30)
            .attr('font-size', '22px')
            .style('font-weight', 'bold')
            .text('View1: Average of Each State')


        /**
         * setting up geoAlbersUSA projection
         * this projection shows the USA map in a compact manner
         * 
         * scaling the map to the containerWidth fits the container
         * in different window sizes
         * 
         * translating the map also positions the map so that it fits the parent
         */
        let projection = d3.geoAlbersUsa()
            .scale(this.config.containerWidth)
            .translate([this.config.containerWidth / 2, 2 * this.config.containerHeight / 5]);

        // geoPath generator for the geoAlbersUSA projection
        vis.pathGenerator = d3.geoPath()
            .projection(projection);

        // Color scale for the avg compensation
        vis.colorScale = d3.scaleLinear()
            .range(["white", "blue"]);

        // from: https://github.com/UBC-InfoVis/447-materials/blob/23Sep/d3-examples/d3-choropleth-map/js/choroplethMap.js
        vis.linearGradient = vis.svg.append('defs').append('linearGradient')
            .attr("id", "legend-gradient");

        vis.legend = vis.svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${vis.config.containerWidth * 0.05},${vis.height - vis.config.containerHeight * 0.15})`);

        vis.legendRect = vis.legend.append('rect')
            .attr('width', vis.config.legendRectWidth)
            .attr('height', vis.config.legendRectHeight);

        vis.legendTitle = vis.legend.append('text')
            .attr('class', 'legend-title')
            .attr('dy', '.35em')
            .attr('y', -10)
            .text('Avg. Compensation')

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // returns the average compensation value given the compensationData
        vis.avgCompensationValue = d => {
            if (d) {
                return d["average_salary"];
            }
            return 0;
        };

        /**
         * Setting the domain of the color scale to
         * 0 - max avg. compensation
         */
        const compensationExtent = [0, d3.max(vis.data.compensationData, vis.avgCompensationValue)];

        vis.colorScale.domain(compensationExtent);

        // adding color stops to the legend, white and blue
        vis.legendStops = [
            { color: '#ffffff', value: compensationExtent[0], offset: 0 },
            { color: '#0000ff', value: compensationExtent[1], offset: 100 },
        ];

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        /**
         * finds companies in a state
         * uses the global locationsPerCompany
         */
        let findCompaniesFromState = (state) => {
            return locationsPerCompany
                .filter((company) => company.locations.includes(state))
                .map((data) => data.company
                    .replace(/\s+/g, '')
                    .replace(/[&$'%^*@]/g, match => '\\' + match));
        }

        // Rendering the USA map
        const map = vis.svg.selectAll(".path")
            .data(vis.data.geoData)
            .join('path')
            .attr('class', 'path')
            .attr("d", vis.pathGenerator)
            .attr("id", (d) => stateAbbreviations[d.properties.name])
            .attr("stroke", "black")
            .attr("stroke-width", "1")
            // applying the color scale
            .attr('fill', d => vis.colorScale(
                vis.avgCompensationValue(
                    vis.data.compensationData.find(cd => cd.state === stateAbbreviations[d.properties.name])
                )
            ))
            /**
             * if the given state is included in the statesSelected filter
             * add the 'selected' CSS class, so we can apply special styles on them
             */
            .classed('selected', (d) => statesSelected.includes(stateAbbreviations[d.properties.name]));

        // Adds tooltip to each state on the map
        map.on('mouseover', (event, d) => {
            // get the avg compensation value of the state
            const avgCompensationValue = vis.avgCompensationValue(
                vis.data.compensationData.find(cd => cd.state === stateAbbreviations[d.properties.name])
            );

            /**
             * getting companies in that state
             * and highlighting the corresponding circle in the circle-packing
             */
            let companies = findCompaniesFromState(stateAbbreviations[d.properties.name])
            for (const company of companies) {
                d3.select(`#${company}`).style("stroke-width", 3)
            }

            // Rendering the tooltip
            d3.select('#tooltip')
                .style('display', 'block')
                .style('left', (event.pageX + vis.config.tooltipPadding / 2) + 'px')
                .style('top', (event.pageY - vis.config.tooltipPadding) + 'px')
                .html(`
                    <h1><b>${d.properties.name}</b></h1>
                    <p><i>Avg. Total Compensation:</i> ${avgCompensationValue ? "$" + avgCompensationValue : "N/A"}</p>
                    `);
        }).on('mousemove', (event) => {
            // update tooltip position when mouse moves to follow the pointer
            d3.select('#tooltip')
                .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
        }).on('mouseleave', (event, d) => {
            // removing tooltip display
            d3.select('#tooltip').style('display', 'none');

            // removing highlighting in circle-packing
            let companies = findCompaniesFromState(stateAbbreviations[d.properties.name])
            for (const company of companies) {
                d3.select(`#${company}`).style("stroke-width", 1)
            }
        }).on('click', function (event, d) {
            // need to get the abbreviations to work with other datasets
            const state = stateAbbreviations[d.properties.name];

            // if the state is already selected, de-select it
            // else select the state
            const index = statesSelected.indexOf(state);
            if (index !== -1) {
                statesSelected.splice(index, 1); // Pop the state off the list.  
            } else {
                statesSelected.push(state);
            }

            // have to re-render other visualizations when the filter changes
            reRenderAll();
        })

        // Rendering the legend
        vis.legend.selectAll('.legend-label')
            .data(vis.legendStops)
            .join('text')
            .attr('class', 'legend-label')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('y', vis.config.legendRectHeight + 10)
            .attr('x', (d, index) => {
                return index == 0 ? 0 : vis.config.legendRectWidth;
            })
            .text(d => `$${d.value}`);

        // Update gradient for legend
        vis.linearGradient.selectAll('stop')
            .data(vis.legendStops)
            .join('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);

        vis.legendRect.attr('fill', 'url(#legend-gradient)');
    }

}
