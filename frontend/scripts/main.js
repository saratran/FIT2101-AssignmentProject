// Function headers

function expandFile() {}
function returnToRepos() {}
function getRepos() {}
function getFiles(reponame) {}
function getFileIcon() {}
function getContributorInfo() {}
function highlightFile() {}
function goToUserPage() {}
function getBarGraph() {}
function getPieChart() {}
function getUser() {}
function hideModal() {}
function showModal() {}
function setEmailFrequencies() {}
function buildNotification() {}
function showNotifications() {}
function checkForNewNotifications() {}
function muteNewNotifications() {}

$(document).ready(function() {
    // All code goes in this function to ensure JQuery and the page are ready before JS code is run
    let repoData;
    let userData;

    const isDev = true;
    const apiUrl = isDev ? `http://localhost:3000/api` : `https://devalarm.com/api`;
    let currentRepo = null;

    let gridItemInfo = "";

    expandFile = (gridItem) => {
        // repo and file info
        let repoName = gridItem.id;
        let fileName = gridItem.querySelectorAll("h1")[0].innerText.trim();

        // save file information for when returning to repo-file view
        gridItemInfo = gridItem.innerHTML;

        // hide repo sidebar
        document.getElementsByClassName("repo-sidebar")[0].className = "repo-sidebar hidden";

        // hide file grid
        gridItem.parentElement.className = "grid slide-out-bck";

        // get file title for master view header
        let gridItemContent = gridItem.querySelectorAll("h1")[0].innerHTML;

        // set up for grid item deletion
        let repoGrid = document.getElementById("repoFiles");
        let repoFileMsnry = new Masonry(repoGrid, {
            // options
            itemSelector: '.grid-item',
            columnWidth: 200,
            gutter: 60,
            originLeft: true
        });

        // create the file master sidebar
        let newSidebar = document.createElement("div");
        let newSidebarHeader = document.createElement("a");
        newSidebarHeader.className = "master-sidebar-header";
        newSidebarHeader.innerHTML = "<div class=\"returnButton\" style=\"text-align: left\"><h3 style=\"color: white; cursor: pointer; margin-top: 0; margin-right: 0; position: absolute\" onclick=\"returnToRepos(this)\"><</h3></div><div style=\"margin-left: 60px; margin-top: 0; text-align: left\">" + gridItemContent + "</div>";
        newSidebar.className = "master-file detailToMaster-target";
        newSidebar.appendChild(newSidebarHeader);
        gridItem.removeAttribute("onclick");

        // remove Issues menu
        $("#issueInformation").hide()

        // remove file from grid
        gridItem.remove();

        // add file to master view
        document.getElementsByClassName("master")[0].appendChild(newSidebar);

        // refresh grid layout
        repoFileMsnry.layout();

        // create detail grid
        let detailGrid = document.createElement("div");
        detailGrid.className = "grid slide-in-bck";
        detailGrid.id = "fileDetails";
        detailGrid.setAttribute("data-masonry", '{ "itemSelector": ".grid-item", "columnWidth": 200, "gutter": 30, "originLeft": true }');
        let fileDetailMsnry = new Masonry(detailGrid, {
            // options
            itemSelector: '.grid-item',
            columnWidth: 200,
            gutter: 30,
            originLeft: true
        });

        // add grid to page
        const gridArea = $('.repo-information').first()
        gridArea.addClass("expanded-repo-information")
        gridArea.prepend(detailGrid);

        // create detail grid elements
        let detailGridItem1 = document.createElement("div");
        let detailGridItem2 = document.createElement("div");
        let detailGridItem3 = document.createElement("div");

        // create svg elements for graphs
        let barGraph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        barGraph.id = "barGraph";
        barGraph.setAttribute("style", "height: 400px; width: 400px");

        // set grid element attributes
        detailGridItem1.className = "grid-item file-detail";
        detailGridItem1.id = "Individual Contributions";
        detailGridItem2.className = "grid-item file-detail pieChart";
        detailGridItem2.id = "User Contribution Ratio";
        detailGridItem2.setAttribute("style", "height: 470px; width: 350px");
        detailGridItem3.className = "grid-item file-detail contributor-table";
        detailGridItem3.id = "Other " + fileName + " Contributors";
        detailGridItem1.innerHTML = "<h1>Individual Contributions</h1>";
        detailGridItem2.innerHTML = "<h1>User Contribution Ratio</h1>";
        detailGridItem3.innerHTML = "<h1>Other " + fileName + " Contributors</h1>";

        // add graphs to relevant grid items
        detailGridItem1.appendChild(barGraph);

        // add detail elements to grid
        detailGrid.appendChild(detailGridItem1);
        detailGrid.appendChild(detailGridItem2);
        detailGrid.appendChild(detailGridItem3);
        fileDetailMsnry.appended(detailGridItem1);
        fileDetailMsnry.appended(detailGridItem2);
        fileDetailMsnry.appended(detailGridItem3);

        // add contributor table and graphs to relevant grid items
        getContributorInfo(repoName, fileName, "contributor-table");

        // add detail references to sidebar
        let gridItem1Reference = document.createElement("a");
        let gridItem2Reference = document.createElement("a");
        let gridItem3Reference = document.createElement("a");
        gridItem1Reference.innerHTML = detailGridItem1.id;
        gridItem2Reference.innerHTML = detailGridItem2.id;
        gridItem3Reference.innerHTML = detailGridItem3.id;
        gridItem1Reference.setAttribute("onclick", "highlightFile(this)");
        gridItem2Reference.setAttribute("onclick", "highlightFile(this)");
        gridItem3Reference.setAttribute("onclick", "highlightFile(this)");
        newSidebar.appendChild(gridItem1Reference);
        newSidebar.appendChild(gridItem2Reference);
        newSidebar.appendChild(gridItem3Reference);

        // refresh grid layout
        fileDetailMsnry.layout();
    }

    returnToRepos = (file) => {

        $("#issueInformation").show()
        // remove master sidebar
        file.classList.remove("master-file", "detailToMaster-target");
        let master = document.getElementsByClassName("master")[0];
        let masterSidebar = document.getElementsByClassName("master-file")[0];
        master.removeChild(masterSidebar);

        const gridArea = $('.repo-information').first()
        gridArea.removeClass("expanded-repo-information")
        // set up repo file grid to return
        let repoFileGrid = document.getElementById("repoFiles");
        let repoFileMsnry = new Masonry(repoFileGrid, {
            // options
            itemSelector: '.grid-item',
            columnWidth: 200,
            gutter: 60,
            originLeft: true
        });

        // create grid element for file in master view
        let newGridItem = document.createElement("div");
        newGridItem.className = "grid-item repo-file";
        newGridItem.setAttribute("onclick", "expandFile(this)");
        newGridItem.innerHTML = gridItemInfo;

        // make repo sidebar visible
        document.getElementsByClassName("repo-sidebar")[0].className = "repo-sidebar visible";

        // add grid element to repo grid
        repoFileGrid.appendChild(newGridItem);
        repoFileMsnry.appended(newGridItem);

        // make file detail grid hidden
        let detailGrid = document.getElementById("fileDetails");
        detailGrid.className = "grid slide-out-bck";
        document.getElementsByClassName("repo-information")[0].removeChild(detailGrid);

        // make repo grid visible
        repoFileGrid.className = "grid slide-in-bck";

        // refresh repo grid layout
        repoFileMsnry.layout();

    }

    getRepos = () => {
        // Fetch access token
        const accessToken = window.localStorage.getItem("accessToken")

        console.log("Fetching repos...");
        const repoList = $("#repo-list");
        repoList.empty();
        const loadingSpinner = $.parseHTML(`<div class="loading-spinner-container"><div class="loading-spinner"><div></div><div></div><div></div><div></div></div></div>`);
        repoList.append(loadingSpinner);

        // Make request for repos
        fetch(apiUrl + `/repositories?access_token=${accessToken}`).then(fetchRes => {
            fetchRes.json().then(json => {
                console.log(json)

                repoList.empty()
                json.forEach(repo => {
                    const repoElement = $.parseHTML(
                        `<a onclick="clickElement(this, event.target, '${ repo.name }')">
                        ${repo.name} | ${repo.description}<div class="round" title="Watch repository"><label><input class="toggle-watch" type="checkbox" ${repo.isWatching && `checked=checked`} onclick="toggleWatching(this, '${ repo.name }'); event.stopImmediatePropagation();" /><span></span></label></div></a>
                    `)

                    repoList.append(repoElement)
                })
            })
        })
    }

    clickElement = (thisElem, target, repoName) => {
        if (!$(target).is('span')) {
            getFiles(repoName);
            Array.from(document.getElementsByClassName('active')).forEach(activeRepoElem => activeRepoElem.setAttribute('class', ''));
            thisElem.setAttribute('class', 'active');
        }
    }

    toggleWatching = (checkboxElem, repoName) => {
      const accessToken = window.localStorage.getItem("accessToken")

      fetch(`${apiUrl}/repos?access_token=${accessToken}`, {
        method: 'PATCH',
        body: JSON.stringify({
          op: "replace",
          path: `/${repoName}/is_watching`,
          value: checkboxElem.checked
        }),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
      })
    }

    getUser = () => {
        const accessToken = window.localStorage.getItem("accessToken")
        fetch(apiUrl + `/user?access_token=${accessToken}`).then(data => {
            data.json().then(json => {
                userData = json
                let header = document.getElementsByClassName("sidebar-header")[0]
                header.innerHTML = `<b>${json.login}</b>`
                header.setAttribute('href', json.html_url);
                header.setAttribute('target', "_blank");
            })
        })
    }

    getFiles = (reponame) => {
        if (reponame === currentRepo) return

        $("#start").remove();
        const load = document.createElement("div")
        load.setAttribute("id", "loadScreen")
        load.innerHTML = `<p>Loading...</br>This may take a while.</p>`

        $("body").first().append(load)

        currentRepo = reponame
        const accessToken = window.localStorage.getItem("accessToken")
        let repoFileGrid = document.getElementById("repoFiles");
        while (repoFileGrid.firstChild) {
            repoFileGrid.removeChild(repoFileGrid.firstChild);
        }
        const repoContent = document.getElementById("repoContent")
        $("#issueInformation").remove()
        let repoFileMsnry = new Masonry(repoFileGrid, {
            // options
            itemSelector: '.grid-item',
            columnWidth: 200,
            gutter: 60,
            originLeft: true
        });

        fetch(apiUrl + `/files/${reponame}?access_token=${accessToken}`).then(fetchRes => {
            fetchRes.json().then(json => {
                repoData = json;
                json.forEach(file => {
                    let newGridItem = document.createElement("div");
                    let fileIcon = getFileIcon(file.filename);
                    newGridItem.className = "grid-item repo-file";
                    newGridItem.id = reponame;
                    newGridItem.setAttribute("onclick", "expandFile(this)");
                    newGridItem.innerHTML = `<h1><img alt="file icon" src="` + fileIcon + `" style="height: 20px; width: 20px;">&nbsp; ${file.filename}</h1><p>Other Contributors:</p>`;
                    if (!Object.keys(file.otherContributors).length) {
                        newGridItem.innerHTML = newGridItem.innerHTML + `<p>None</p>`;
                    } else {
                        file.otherContributors.forEach(contributor => {
                            newGridItem.innerHTML = newGridItem.innerHTML + `<p>${contributor.name}</p>`;
                        })
                    }

                    // add grid element to repo grid
                    repoFileGrid.appendChild(newGridItem);
                    repoFileMsnry.appended(newGridItem);
                    // make repo grid visible
                    repoFileGrid.className = "grid slide-in-bck";
                })
            })
        }).then(() => {

            fetch(apiUrl + `/issues/${reponame}?access_token=${accessToken}`).then(fetchRes => {
                fetchRes.json().then(json => {

                    console.log(json)
                    let issueInfo = document.createElement("div");
                    issueInfo.setAttribute("id", "issueInformation")
                    repoContent.appendChild(issueInfo)

                    let repoIssueTable = document.createElement("table")
                    repoIssueTable.setAttribute("id", "issueTable")
                    repoIssueTable.innerHTML = `
                    <tr>
                        <th><b>Your Issues</b></th>
                    </tr>`

                    if (!Object.keys(json).length) {
                        let newIssue = document.createElement("tr");
                        newIssue.innerHTML = '<td style="background-color:white">No relevant issues to display.</td>';
                        repoIssueTable.appendChild(newIssue)
                    } else {
                        json.forEach(item => {
                            let newIssue = document.createElement("tr")
                            newIssue.setAttribute("class", "issueTitle issueHeader");
                            newIssue.innerHTML = `<td><b>${item.title}</b></td>`
                            repoIssueTable.appendChild(newIssue)
                            let issueBody = document.createElement("tr")
                            issueBody.innerHTML = `<td>${item.body}</td>`
                            repoIssueTable.appendChild(issueBody)
                            let issueCreator = document.createElement("tr")
                            issueCreator.innerHTML = `<td><i>Issue opened by ${item.createdBy}</i></td>`
                            repoIssueTable.appendChild(issueCreator)
                        })
                    }


                    let bottom = document.createElement("tr");
                    bottom.setAttribute("class", "issueTitle");
                    bottom.innerHTML = '<td id = "issueBottom"></td>'
                    repoIssueTable.appendChild(bottom)
                    repoIssueTable.className = "slide-in-bck"
                    issueInfo.appendChild(repoIssueTable)

                    const titles = document.getElementsByClassName('issueTitle')
                    for (let title of titles) {
                        $(title).nextUntil('tr.issueTitle').toggle();
                        title.onclick = function () {
                            $(this).nextUntil('tr.issueTitle').toggle();
                        }
                    }
                    // refresh repo grid layout
                    repoFileMsnry.layout();
                    document.getElementById("loadScreen").remove()
                    checkForNewNotifications();
                })
            })
        })

    }

    getContributorInfo = (repoName, fileName, gridItemClass) => {
        let graphData = [];
        //fetch(apiUrl + `/files-mock/${repoName}`).then(fetchRes => {
        //fetchRes.json().then(json => {
        repoData.forEach(file => {
            // check for correct file
            if (file.filename === fileName) {
                // create table elements
                let contributorInfo = document.createElement("table");
                contributorInfo.setAttribute("id", "contributorTable")
                let tableHeader = document.createElement("tr");
                let tableHeader1 = document.createElement("th");
                let tableHeader2 = document.createElement("th");
                let tableHeader3 = document.createElement("th");
                tableHeader1.innerHTML = "Name";
                tableHeader2.innerHTML = "Username";
                tableHeader3.innerHTML = "Contact Information";

                // set header and cells
                tableHeader.className = "header";
                tableHeader.appendChild(tableHeader1);
                tableHeader.appendChild(tableHeader2);
                tableHeader.appendChild(tableHeader3);

                // add header to table
                contributorInfo.appendChild(tableHeader);
                if (file.yourContributions) {
                  let dataItem = {
                    name: `${userData.name === null ? userData.login : userData.name}`,
                    cont: Number(`${file.yourContributions.lineChangeCount}`)
                  };
                  graphData.push(dataItem);
                }

                // add contributor info
                file.otherContributors.forEach(contributor => {
                    // create new row and cells
                    let newContributor = document.createElement("tr");
                    let contributorName = document.createElement("td");
                    let userName = document.createElement("td");
                    let contactInfo = document.createElement("td");

                    // add contributor information to cells
                    contributorName.innerHTML = `${contributor.name}`;
                    userName.innerHTML = `${contributor.username}`;
                    contactInfo.innerHTML = `${contributor.email}`;

                    // get graph data from contributor
                    let dataItem = {
                        name: `${contributor.name === null ? contributor.username : contributor.name}`,
                        cont: Number(`${contributor.contribution.lineChangeCount}`)
                    };
                    graphData.push(dataItem);

                    // set row attributes
                    newContributor.id = userName.innerHTML
                    newContributor.setAttribute("onclick", "goToUserPage(this)")
                    newContributor.appendChild(contributorName);
                    newContributor.appendChild(userName);
                    newContributor.appendChild(contactInfo);

                    // add row to table
                    contributorInfo.appendChild(newContributor);
                });

                // create pie chart and bar graph and add to relevant grid elements
                getBarGraph(graphData, "barGraph");
                getPieChart(graphData, "pieChart");

                // add table to relevant grid element
                let gridItem = document.getElementsByClassName(gridItemClass)[0];
                gridItem.appendChild(contributorInfo);
            }
        })
        //    })
        // })
    }

    getFileIcon = (fileName) => {
        let imagePath = "";
        let fileType = fileName.substring(fileName.indexOf(".") + 1, fileName.length).toUpperCase();

        // check for file type and return relevant image path for icon
        if (["JPG", "PNG", "GIF", "WEBP", "TIFF", "PSD", "RAW", "BMP", "HEIF", "INDD", "JPEG", "SVG", "AI", "EPS", "PDF"].includes(fileType)) {
            imagePath = "https://www.pngrepo.com/png/141793/170/image-file.png";
        } else if (["HTML", "MD", "CSS", "TXT"].includes(fileType)) {
            imagePath = "https://icon-library.net/images/file-icon-png/file-icon-png-23.jpg";
        } else {
            imagePath = "https://www.pngrepo.com/png/26279/170/code-file.png";
        }

        return imagePath;
    }

    highlightFile = (fileAttribute) => {
        let itemToHighlight = document.getElementById(fileAttribute.innerHTML);

        // scroll to relevant item
        window.scrollTo({
            top: itemToHighlight.getBoundingClientRect().top - 70,
            behavior: "smooth"
        });

        // pulse item
        itemToHighlight.classList.add("highlight-pulsate");

        // remove pulse attribute so it can be repeated multiple times after 1 second (duration of pulse animation)
        setTimeout(function () {
            itemToHighlight.classList.remove("highlight-pulsate")
        }, 1000);
    }

    goToUserPage = (username) => {
        let pageName = username.id;

        // open user github page in new window
        var win = window.open("https://github.com/" + pageName, '_blank');
        win.focus();
    }

    getBarGraph = (graphData, elementId) => {
        //dimensions for the bar chart along with a margin
        var margin = 60;
        var width = (200 * graphData.length) - 2 * margin;
        var height = 400 - 2 * margin;
        var max = 0;

        //find the max contribution
        for (i = 0; i < graphData.length; i++) {
            if (graphData[i].cont > max) {
                max = graphData[i].cont
            }
        }

        //select the svg container and append an object and translate it to leave margin on top and left
        var svg = d3.select("#" + elementId);
        var chart = svg.append("g").attr("transform", "translate(" + margin + "," + margin + ")")

        //set the color scheme for the data
        var color = d3.scaleOrdinal().range(["#247BA0", "#70C1B3", "#B2DBBF", "#F3FFBD", "#FF1654", '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D', '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC', '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399', '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933', '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF']);

        //set the linear domain and split it linearly within the height
        var yScale = d3.scaleLinear().range([height, 0]).domain([0, max]);

        //append the yScale and form the y axis of the bar graph
        chart.append("g").call(d3.axisLeft(yScale));

        //set the range and split it in the width with the names of contributors
        var xScale = d3.scaleBand().range([0, width]).domain(graphData.map((d) => d.name)).padding(0.4);

        //append the xScale and transalte it to form the x axis of the bar graph
        chart.append("g").attr("transform", "translate(0, " + height + ")").call(d3.axisBottom(xScale));

        chart
            .selectAll()
            .data(graphData)
            .enter()
            .append("rect")
            .attr("x", (s) => xScale(s.name))
            .attr("y", (s) => yScale(s.cont))
            .attr("height", (s) => height - yScale(s.cont))
            .attr("width", xScale.bandwidth())
            .attr("fill", (s) => color(s.name))
            //add a funtion to highlight the bar when cursor hovers over it
            .on("mouseenter", function (s, i) {
                d3
                    .select(this)
                    .transition()
                    .duration(300)
                    .attr('opacity', 0.6)
                    .attr('x', (a) => xScale(a.name) - 5)
                    .attr('width', xScale.bandwidth() + 10);
                var y = yScale(s.cont);
                chart
                    .append("line")
                    .attr("x1", 0)
                    .attr("y1", y)
                    .attr("x2", width)
                    .attr("y2", y)
                    .attr("stroke", "#D85F7D")
                    .style("stroke-dasharray", "5,5");
                chart
                    .append("text")
                    .attr("id", "contNum")
                    .attr("x", width + 20)
                    .attr("y", y + 4)
                    .attr("text-anchor", "middle")
                    .text(s.cont + " lines")
                    .attr("font-size", "10px")
            })
            //add a function to remove any changes when cursor leave the bar
            .on("mouseleave", function (actual, i) {
                d3
                    .select(this)
                    .transition()
                    .duration(300)
                    .attr('opacity', 1)
                    .attr('x', (a) => xScale(a.name))
                    .attr('width', xScale.bandwidth());
                chart
                    .selectAll("line")
                    .remove();
                chart
                    .selectAll("#contNum")
                    .remove();
            });

        //add label to y axis
        svg.append("text").attr("x", -(height / 2) - margin).attr("y", margin / 2.4).attr("transform", "rotate(-90)").attr("text-anchor", "middle").text("Number of Lines Contributed").attr("font-size", "11px");

        //add label to the x axis
        svg.append("text").attr("x", width / 2 + margin).attr("y", height + 2 * margin - 20).attr("text-anchor", "middle").text("Names of Contributors").attr("font-size", "11px")
    }

    getPieChart = (chartData, gridElementClass) => {
        //set dimensions of piechart
        var width = 350;
        var height = 350;
        var margin = 0;

        //radii of piechart
        var outerRadius = 150;
        var inRadius = 100;

        //set the dimensions of the legend blocks
        var legRectSize = 15;
        var legSpacing = 8;

        //variables needed
        var total = 0;
        var number = 0;

        //set the color range for the data in the piechart
        var color = d3.scaleOrdinal().range(["#247BA0", "#70C1B3", "#B2DBBF", "#F3FFBD", "#FF1654", '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D', '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC', '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399', '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933', '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF']);

        //append svg to the body tag in html and then append an object and translate it to middle
        var svg = d3
            .select("." + gridElementClass)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("background", "white")
            .append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        //find the total number of lines contributed
        for (i = 0; i < chartData.length; i++) {
            total = total + chartData[i].cont;
        }

        //find the percentage of contribution and append as a property
        for (i = 0; i < chartData.length; i++) {
            number = (chartData[i].cont / total) * 100;
            chartData[i].perc = Math.round(number * 10) / 10;
        }

        //bind the data to a piechart in d3
        var data = d3
            .pie()
            .sort(null)
            .value(function (d) {
                return d.perc;
            })(chartData);

        //set the radii of the piechart and add padding
        var sectors = d3
            .arc()
            .innerRadius(inRadius)
            .outerRadius(outerRadius)
            .padAngle(.05)
            .padRadius(50);

        //add data to segments and fill them with color
        var sections = svg.selectAll("path").data(data);
        sections.enter()
            .append("path")
            .attr("d", sectors)
            .attr("fill", function (d, i) {
                return color(d.data.name);
            })

        //add a legend to the middle of the donut chart
        var legend = svg
            .selectAll(".legend")
            .data(color.domain())
            .enter()
            .append("g")
            .attr("class", "legend")
            .attr("transform", function (d, i) {
                var height = legRectSize + legSpacing;
                var offset = height * color.domain().length / 2;
                var horz = -4 * legRectSize;
                var vert = i * height - offset;
                return "translate(" + horz + "," + vert + ")";
            });

        //create containers for colors of the legend
        legend
            .append("rect")
            .attr("width", legRectSize)
            .attr("height", legRectSize)
            .style("fill", color)
            .style("stroke", color);

        //add text to the legend for names and percentages
        legend
            .append("text")
            .attr("x", legRectSize + legSpacing)
            .attr("y", legRectSize - legSpacing + 4)
            .text(function (d, i) {
                return color.domain()[i] + " - " + chartData[i].perc + "%";
            });
    }

    hideModal = () => {
        let modal = $("#emailModal")
        modal.removeClass("show-modal")
    }

    showModal = () => {
        let modal = $("#emailModal")
        modal.addClass("show-modal")
    }

    setEmailFrequencies = () => {
        const accessToken = window.localStorage.getItem("accessToken")
        const radioIds = ['#individualRadio', '#dailyRadio', '#weeklyRadio', '#neverRadio']
        let frequency;
        for (const id of radioIds){
            if ($(id).is(':checked')) {
                frequency = $(id).attr("value")
                break
            }
        }
        if (frequency) {
            fetch(apiUrl + `/email-frequency?access_token=${accessToken}`, {
                body: JSON.stringify({frequency}),
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }).then(fetchRes => {})
        }
    }

    buildNotification = (contributorUsername, notifType, notifItemName, repoName) => {
        // get
        fetch(apiUrl + `/users/${contributorUsername}`).then(fetchRes => {
            fetchRes.json().then(userData => {
                let userAvatarURL = `${userData.avatar_url}`;
                let notificationPane = $("#notification-pane")
                let notificationItem = document.createElement("div");
                let userAvatar = document.createElement("img");
                let contentTitle = document.createElement("p");
                let contentBody = document.createElement("p");

                const messages = {
                  "file": "modified a file",
                  "issue-open": "has opened an issue",
                  "issue-closed": "has closed an issue",
                  "issue-comment": "has commented on an issue",
                  "issue-edited": "has edited an issue",
                  "issue-added": "has added an issue",
                }

                const action = messages[notifType]

                contentTitle.className = "notification-title";
                contentTitle.innerHTML = "<b class='notification-emphasis'>" + contributorUsername + "</b> has " + action + " in " + "<b class='notification-emphasis'>" + repoName + "</b>."
                contentBody.className = "notification-body";
                contentBody.innerHTML = notifItemName;
                notificationItem.className = "notification-item new";
                userAvatar.src = userAvatarURL;
                userAvatar.className = "avatar";

                notificationItem.appendChild(userAvatar);
                notificationItem.appendChild(contentTitle);
                notificationItem.appendChild(contentBody);
                notificationItem.innerHTML += "<div style='clear:both'>&nbsp</div>";
                notificationPane.prepend(notificationItem);
            })
        })
    }

    checkForNewNotifications = () => {
      const notifPane = $("#notification-pane")
      const notifications = Array.from(notifPane.children())
      const notificationBadge = $("#badge")
      const notifCount = notifications.filter(({ classList }) => classList.contains("new")).length

      if (notifCount) {
        notificationBadge.html(notifCount > 9 ? "9+" : String(notifCount))
        notificationBadge.addClass("show-badge")
      } else {
        notifPane.html("<p class='notification-emphasis no-notifs'>No Notifications</p>");
      }
    }

    showNotifications = () => {
        const notificationPane = $("#notification-pane")
        const notificationBadge = $("#badge")

        if (!notificationPane.hasClass("notifications-visible")) {
            notificationPane.addClass("notifications-visible")
        }
        else {
            notificationPane.removeClass("notifications-visible");
            muteNewNotifications()
        }
    }

    muteNewNotifications = () => {
      Array.from($("#notification-pane").children())
        .filter(notif => notif.hasClass("notification-item") && notif.hasClass("new"))
        .forEach(notif => notif.removeClass("new"))
    }

    $("#getReposButton").on("click", getRepos);

    const span = $(".close").first()
    span.on("click", hideModal)

    const saveButton = $("#saveEmailFrequencies")
    saveButton.on("click", hideModal)
    saveButton.on("click", setEmailFrequencies)

    let button = $("#emailFrequencies")
    button.on("click", showModal)

    window.onclick = function(event) {
        if (event.target === document.getElementById("emailModal")) hideModal()
    }

    // On page load
    getUser();
    getRepos();
    buildNotification("DanaC05", "file", "server.js", "cool-have-fun");
    buildNotification("coolhavefun3", "issue", "index.handlebars", "cool-have-fun");
    //getFiles();
});