import { ClassifierScore, ClassificationSnapshot, getClassificationHistory, sortClassifiers, scoreNeededForTarget } from "./classifications";
import { parseTextInput } from "./parsing";

// Class bands definition (same as Python version)
const classBands = {
    'GM': {threshold: 95, color: 'darkred'},
    'M':  {threshold: 85, color: 'purple'},
    'A':  {threshold: 75, color: 'blue'},
    'B':  {threshold: 60, color: 'green'},
    'C':  {threshold: 40, color: 'orange'},
    'D':  {threshold: 2,  color: 'gray'}
};

// Get class color based on score
function getClassColor(score) {
    for (const [label, {threshold, color}] of Object.entries(classBands)) {
        if (score >= threshold) {
            return color;
        }
    }
    return 'gray';
}

// Get current class and next class info based on score
function getClassInfo(score) {
    let currentClass = 'U';
    let nextClass = 'D';
    let nextThreshold = 2;
    
    const sortedClasses = Object.entries(classBands)
        .sort((a, b) => b[1].threshold - a[1].threshold);
    
    for (const [label, {threshold}] of sortedClasses) {
        if (score >= threshold) {
            currentClass = label;
            break;
        }
        nextClass = label;
        nextThreshold = threshold;
    }
    
    return { currentClass, nextClass, nextThreshold };
}

// Toggle instructions visibility
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggle-instructions');
    const instructionsDiv = document.querySelector('.instructions');
    
    toggleBtn?.addEventListener('click', function() {
        if (instructionsDiv !== null) {
            if (instructionsDiv["style"].display === 'none') {
                instructionsDiv["style"].display = 'block';
                toggleBtn.textContent = 'Hide Instructions';
            } else {
                instructionsDiv["style"].display = 'none';
                toggleBtn.textContent = 'Show Instructions';
            }
        }
    });
});

// Process data and generate chart using regex
document.getElementById('process-btn')?.addEventListener('click', function() {
    const textInput = (<HTMLInputElement>document.getElementById('tsv-input'))?.value.trim();
    const errorDiv = document.getElementById('error')!;
    const nextClassInfoDiv = document.getElementById('next-class-info');
    const resultsContainer = document.getElementById('results-container')!;
    const currentClassDiv = document.getElementById('current-class');
    const currentAvgDiv = document.getElementById('current-avg');
    
    errorDiv.style.display = 'none';
    resultsContainer.style.display = 'none';
    
    if (!textInput) {
        errorDiv.textContent = "Please paste data first.";
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const allClassifiers = sortClassifiers(parseTextInput(textInput));
        const history = getClassificationHistory(allClassifiers);

        // Sort by date
        allClassifiers.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Calculate next class info
        if (history.length > 0) {
            const currentAvg = history[history.length - 1].percentage;
            const { currentClass, nextClass, nextThreshold } = getClassInfo(currentAvg);

            // Find all-time high rolling average and its class
            let maxAvg = currentAvg;
            let maxClass = currentClass;
            for (const snap of history) {
                if (snap.percentage > maxAvg) {
                    maxAvg = snap.percentage;
                    maxClass = getClassInfo(snap.percentage).currentClass;
                }
            }

            currentClassDiv!.textContent = `Current Class: ${currentClass}`;
            currentAvgDiv!.textContent = `Current Average: ${currentAvg.toFixed(2)}%`;
            // Show all-time high
            const allTimeDiv = document.getElementById('all-time-high');
            if (allTimeDiv) {
                allTimeDiv.textContent = `All-time High: ${maxAvg.toFixed(2)}% (${maxClass})`;
                allTimeDiv.style.display = 'block';
            }

            let nextClassInfo = "";
            if (maxClass === 'GM') {
                nextClassInfo = "Congratulations! You've reached Grandmaster classification!";
            } else {
                // Always show what it takes to class up past your all-time best class
                // Find the next class above your all-time best
                const classOrder = ['D', 'C', 'B', 'A', 'M', 'GM'];
                const maxClassIdx = classOrder.indexOf(maxClass);
                const nextBestClass = classOrder[maxClassIdx + 1];
                const nextBestThreshold = classBands[nextBestClass]?.threshold;
                if (!nextBestThreshold) {
                    nextClassInfo = "No higher class available.";
                } else {
                    const scoreNeeded = scoreNeededForTarget(allClassifiers, nextBestThreshold);
                    if (scoreNeeded === null) {
                        nextClassInfo = `Not enough scores yet to compute a rolling average.`;
                    } else if (scoreNeeded > 110) {
                        nextClassInfo = `To reach ${nextBestClass} class, you need: ${scoreNeeded.toFixed(2)}% on your next classifier (impossible in one match).`;
                    } else if (scoreNeeded > 100) {
                        nextClassInfo = `To reach ${nextBestClass} class, you need: ${scoreNeeded.toFixed(2)}% on your next classifier (USPSA now recognizes scores up to 110% of the HHF).`;
                    } else {
                        nextClassInfo = `To reach ${nextBestClass} class, you need: ${scoreNeeded.toFixed(2)}% on your next classifier.`;
                    }
                }
            }
            nextClassInfoDiv!.textContent = nextClassInfo;
            resultsContainer.style.display = 'block';
        }
        
        // Create the chart manually with SVG
        const svgOutput = createSVGChart(allClassifiers, history);
        document.getElementById('chart-container')!.innerHTML = svgOutput;
        
    } catch (e) {
        if (e instanceof Error) {
            errorDiv.textContent = `Error processing data: ${e.message}`;
            errorDiv.style.display = 'block';
        }
    }
});

function createSVGChart(data: ClassifierScore[], history: ClassificationSnapshot[]) {
    // Set dimensions
    const width = 900;
    const height = 500;
    const margin = { top: 50, right: 50, bottom: 70, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Find date range
    const minDate = data[0].date;
    const maxDate = data[data.length - 1].date;
    const timeRange = maxDate.getTime() - minDate.getTime();
    const daysInRange = timeRange / (24 * 60 * 60 * 1000);
    
    // Create scale functions
    function xScale(date: Date) {
        return margin.left + (innerWidth * (date.getTime() - minDate.getTime()) / timeRange);
    }
    
    function yScale(value: number) {
        return margin.top + innerHeight - (innerHeight * value / 100);
    }
    
    // Start SVG
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add background grid
    svg += `<g class="grid">`;
    // Horizontal lines every 10%
    for (let i = 0; i <= 100; i += 10) {
        const y = yScale(i);
        svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" 
                stroke="#dddddd" stroke-width="1" stroke-dasharray="5,5" />`;
        svg += `<text x="${margin.left - 10}" y="${y + 5}" text-anchor="end" font-size="12">${i}%</text>`;
    }
    
    // Determine appropriate tick spacing based on date range
    let tickInterval;
    let tickFormat;
    
    if (daysInRange <= 60) { // Less than 2 months: show weekly ticks
        tickInterval = 7 * 24 * 60 * 60 * 1000; // One week
        tickFormat = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else if (daysInRange <= 365) { // Less than a year: show monthly ticks
        tickInterval = 30 * 24 * 60 * 60 * 1000; // Approximately one month
        tickFormat = (date) => date.toLocaleDateString(undefined, { month: 'short' });
    } else if (daysInRange <= 365 * 2) { // Less than 2 years: show quarterly ticks
        tickInterval = 91 * 24 * 60 * 60 * 1000; // Approximately one quarter
        tickFormat = (date) => date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    } else { // More than 2 years: show half-yearly or yearly ticks
        tickInterval = 182 * 24 * 60 * 60 * 1000; // Approximately half year
        tickFormat = (date) => date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
    
    // Calculate number of ticks to show (cap at a reasonable number)
    const maxTicks = 12;
    let numTicks = Math.min(maxTicks, Math.ceil(timeRange / tickInterval));
    tickInterval = timeRange / numTicks;
    
    // Draw vertical grid lines
    for (let i = 0; i <= numTicks; i++) {
        const date = new Date(minDate.getTime() + i * tickInterval);
        const x = xScale(date);
        svg += `<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" 
                stroke="#dddddd" stroke-width="1" stroke-dasharray="5,5" />`;
        const label = tickFormat(date);
        svg += `<text x="${x}" y="${height - margin.bottom + 20}" text-anchor="middle" font-size="12">${label}</text>`;
    }
    svg += `</g>`;
    
    // Draw class lines
    Object.entries(classBands).forEach(([label, {threshold, color}]) => {
        const y = yScale(threshold);
        svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" 
                stroke="${color}" stroke-width="2" stroke-dasharray="5,5" />`;
        svg += `<text x="${width - margin.right + 10}" y="${y + 5}" font-size="12" fill="${color}">${label}</text>`;
    });
    
    // Draw raw scores
    data.forEach(row => {
        const x = xScale(row.date);
        const y = yScale(row.percent);
        const scoreColor = getClassColor(row.percent); // Color based on classification level
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="${scoreColor}" opacity="0.5" />`;
        
        // Add tooltip on hover
        svg += `<g>
            <circle cx="${x}" cy="${y}" r="8" fill="transparent" />
            <title>Date: ${row.date} - Score: ${row.percent.toFixed(2)}%</title>
        </g>`;
    });
    
    // Draw rolling avg line
    if (history.length > 1) {
        svg += `<polyline points="`;
        for (const snapshot of history) {
            svg += `${xScale(snapshot.date)},${yScale(snapshot.percentage)} `;
        };
        svg += `" fill="none" stroke="black" stroke-width="2" opacity="0.7" />`;
    }
    
    // Draw colored points for rolling avg
    for (const snapshot of history) {
        const x = xScale(snapshot.date);
        const y = yScale(snapshot.percentage);
        svg += `<circle cx="${x}" cy="${y}" r="7" fill="${getClassColor(snapshot.percentage)}" stroke="black" />`;
        
        // Add tooltip on hover
        svg += `<g>
            <circle cx="${x}" cy="${y}" r="12" fill="transparent" />
            <title>Date: ${snapshot.date.toLocaleDateString()} - Avg: ${snapshot.percentage.toFixed(2)}%</title>
        </g>`;
    }
    
    // Add title and labels
    svg += `<text x="${width/2}" y="25" text-anchor="middle" font-size="16" font-weight="bold">USPSA Classifier Progress</text>`;
    svg += `<text x="${width/2}" y="${height - 15}" text-anchor="middle" font-size="14">Date</text>`;
    svg += `<text x="20" y="${height/2}" text-anchor="middle" font-size="14" transform="rotate(-90 20,${height/2})">Classifier Average (%)</text>`;
    
    // End SVG
    svg += `</svg>`;
    return svg;
}