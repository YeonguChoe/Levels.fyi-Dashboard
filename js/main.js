// used to match states from different datasets
const stateAbbreviations = {
    "Alabama": "AL",
    "Alaska": "AK",
    "Arizona": "AZ",
    "Arkansas": "AR",
    "California": "CA",
    "Colorado": "CO",
    "Connecticut": "CT",
    "Delaware": "DE",
    "Florida": "FL",
    "Georgia": "GA",
    "Hawaii": "HI",
    "Idaho": "ID",
    "Illinois": "IL",
    "Indiana": "IN",
    "Iowa": "IA",
    "Kansas": "KS",
    "Kentucky": "KY",
    "Louisiana": "LA",
    "Maine": "ME",
    "Maryland": "MD",
    "Massachusetts": "MA",
    "Michigan": "MI",
    "Minnesota": "MN",
    "Mississippi": "MS",
    "Missouri": "MO",
    "Montana": "MT",
    "Nebraska": "NE",
    "Nevada": "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    "Ohio": "OH",
    "Oklahoma": "OK",
    "Oregon": "OR",
    "Pennsylvania": "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    "Tennessee": "TN",
    "Texas": "TX",
    "Utah": "UT",
    "Vermont": "VT",
    "Virginia": "VA",
    "Washington": "WA",
    "West Virginia": "WV",
    "Wisconsin": "WI",
    "Wyoming": "WY"
};

// List of locations grouped by company
let locationsPerCompany = [];
// Reference to the previously selected company
let prevSelectedCompany = "Google";
// Selected Company Filter
let selectedCompany = "";

// Selected States Filter
let statesSelected = [];

// Views 
let usaMap, barChart, treeMap, circlePacking, beeSwarm, groupedbarchart;

// Data 
let statesData;

d3.json('data/state.json')
    .then(data => {
        // Convert sales strings to numbers
        statesData = data;
        statesData.forEach(d => {
            d.average_salary = +d.average_salary;
            d.cost_of_living = +d.cost_of_living;
        });

        //////////////////////////////////////////////////////////
        // Grouped bar chart
        //////////////////////////////////////////////////////////

        // containerRect is a reference to the HTML element #usa-map
        // used to get the size of the HTML element
        const containerRect = document.getElementById('grouped-bar-chart').getBoundingClientRect();
        groupedbarchart = new Groupedbarchart({
            parentElement: '#grouped-bar-chart',
            containerWidth: containerRect.width,
            containerHeight: containerRect.height,
        }, statesData);

        // Show chart
        groupedbarchart.updateVis();
        //////////////////////////////////////////////////////////

        //////////////////////////////////////////////////////////
        // USA Map
        //////////////////////////////////////////////////////////
        d3.json('data/us-states.json').then(data => {
            // containerRect is a reference to the HTML element #usa-map
            // used to get the size of the HTML element
            const containerRect = document.getElementById('usa-map').getBoundingClientRect();

            usaMap = new USAMap({
                parentElement: '#usa-map',
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
            }, {
                geoData: data.features,
                compensationData: statesData,
            });

            usaMap.updateVis();
        });
        //////////////////////////////////////////////////////////
    })
    .catch(error => console.error(error));

d3.json('data/companies.json')
    .then(data => {
        data.forEach(d => {
            d.compensation = +d.compensation;
        })

        /* Preprocess the dataset */
        let groupedByCompany = d3.groups(data, d => toTitleCase(d.company.trim()));
        groupedByCompany = groupedByCompany.filter(c => c[1].length >= 10);

        /*** TreeMap ***/
        // containerTreeMapRect is a reference to the HTML element #usa-map
        // used to get the size of the HTML element
        const containerTreeMapRect = document.getElementById('treemap').getBoundingClientRect();
        treeMap = new TreeMap({
            parentElement: '#treemap',
            containerWidth: containerTreeMapRect.width,
            containerHeight: containerTreeMapRect.height,
        }, data);
        treeMap.updateVis();

        /*** Circle Packing ***/
        for (const comp of groupedByCompany) {
            let indiv = {};
            indiv.company = comp[0];
            indiv.locations = []
            for (const each of comp[1]) {
                if (!(indiv.locations.includes(each.state))) {
                    indiv.locations.push(each.state)
                }
            }
            locationsPerCompany.push({ ...indiv })
        }

        // Initialize chart
        // containerCirclePackingRect is a reference to the HTML element #usa-map
        // used to get the size of the HTML element
        const containerCirclePackingRect = document.getElementById('packed-circles-container').getBoundingClientRect();
        circlePacking = new Circles({
            parentElement: '#packed-circles',
            containerWidth: containerCirclePackingRect.width,
            containerHeight: containerCirclePackingRect.height,
        }, data);
        circlePacking.updateVis();

        /*** Bee Swarm ***/
        const companyAvgCompensation = groupedByCompany.map(([name, locations]) => {
            const totalCompensation = locations.reduce((totalCompensation, location) => location.compensation + totalCompensation, 0)
            return {
                name,
                avgTotalCompensation: Math.floor(totalCompensation / locations.length)
            }
        });
        
        // Initialize chart
        // containerBeeSwarmRect is a reference to the HTML element #usa-map
        // used to get the size of the HTML element
        const containerBeeSwarmRect = document.getElementById('beeswarm').getBoundingClientRect();
        beeSwarm = new BeeSwarm({
            parentElement: '#beeswarm',
            containerWidth: containerBeeSwarmRect.width,
            containerHeight: containerBeeSwarmRect.height,
        }, companyAvgCompensation);
        beeSwarm.updateVis();
    })
////////////////////////////////////////////////////////

// reRenderAll, re-renders all visualizations that need to be updated
// when a filter changes
function reRenderAll() {
    usaMap.updateVis();
    treeMap.updateVis();
    groupedbarchart.updateVis();
}

/**
 * Global filter event listener for filtering companies 
 */
d3.select('#companies-selector').on('change', function () {
    let selection = d3.select(this).property('value');
    if (selection === 'all') {
        circlePacking.filterVal = 0;
    } else if (selection === 'ten') {
        circlePacking.filterVal = 100000;
    } else if (selection === 'fifteen') {
        circlePacking.filterVal = 150000;
    } else if (selection === 'twenty') {
        circlePacking.filterVal = 200000;
    } else if (selection === 'twenty-five') {
        circlePacking.filterVal = 250000;
    }

    circlePacking.updateVis();
});

//////////////////////////////////////////////////////////
// Util
//////////////////////////////////////////////////////////


// from: https://stackoverflow.com/questions/32589197/how-can-i-capitalize-the-first-letter-of-each-word-in-a-string-using-javascript
function toTitleCase(str) {
    let splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        // You do not need to check if i is larger than splitStr length, as your for does that for you
        // Assign it back to the array
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
    // Directly return the joined string
    return splitStr.join(' ');
}