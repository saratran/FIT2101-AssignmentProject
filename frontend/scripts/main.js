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

$(document).ready(function() {
  // All code goes in this function to ensure JQuery and the page are ready before JS code is run

  const isDev = true;
  const apiUrl = isDev ? `http://localhost:3000/api` : `https://devalarm.com/api`;

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
    let gridArea = document.getElementsByClassName("repo-information")[0];
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
    detailGridItem3.id = fileName + " Contributors";
    detailGridItem1.innerHTML = "<h1>Individual Contributions</h1>";
    detailGridItem2.innerHTML = "<h1>User Contribution Ratio</h1>";
    detailGridItem3.innerHTML = "<h1>" + fileName + " Contributors</h1>";

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
    // remove master sidebar
    file.classList.remove("master-file", "detailToMaster-target");
    let master = document.getElementsByClassName("master")[0];
    let masterSidebar = document.getElementsByClassName("master-file")[0];
    master.removeChild(masterSidebar);

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

        repoList.empty();
        json.forEach(repo => {
          const repoElement = $.parseHTML(`<a>${repo.name} | ${repo.description}</a>`)
          repoList.append(repoElement)
        })
      })
    })
  }

  getFiles = (reponame) => {
    // Getting mock repo data
    let repoFileGrid = document.getElementById("repoFiles");
    let repoFileMsnry = new Masonry(repoFileGrid, {
      // options
      itemSelector: '.grid-item',
      columnWidth: 200,
      gutter: 60,
      originLeft: true
    });

    fetch(apiUrl + `/files-mock/${reponame}`).then(fetchRes => {
      fetchRes.json().then(json => {
        console.log(json)
        json.forEach(file => {
          let newGridItem = document.createElement("div");
          let fileIcon = getFileIcon(file.filename);
          newGridItem.className = "grid-item repo-file";
          newGridItem.id = reponame;
          newGridItem.setAttribute("onclick", "expandFile(this)");
          newGridItem.innerHTML = `<h1><img alt="file icon" src="` + fileIcon + `" style="height: 20px; width: 20px;">&nbsp; ${file.filename}</h1><p>Other Contributors:</p>`;
          file.otherContributors.forEach(contributor => {
            newGridItem.innerHTML = newGridItem.innerHTML + `<p>${contributor.name}</p>`;
          })


          // add grid element to repo grid
          repoFileGrid.appendChild(newGridItem);
          repoFileMsnry.appended(newGridItem);

          // make repo grid visible
          repoFileGrid.className = "grid slide-in-bck";

          // refresh repo grid layout
          repoFileMsnry.layout();
        })
      })
    })
  }

  getContributorInfo = (repoName, fileName, gridItemClass) => {
    let graphData = [];
    fetch(apiUrl + `/files-mock/${repoName}`).then(fetchRes => {
      fetchRes.json().then(json => {
        json.forEach(file => {
          // check for correct file
          if (file.filename === fileName) {
            // create table elements
            let contributorInfo = document.createElement("table");
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
              let dataItem = {name: `${contributor.username}`, cont: Number(`${contributor.contribution.lineChangeCount}`)};
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
      })
    })
  }

  getFileIcon = (fileName) => {
    let imagePath = "";
    let fileType = fileName.substring(fileName.indexOf(".") + 1, fileName.length).toUpperCase();

    // check for file type and return relevant image path for icon
    if (["JPG", "PNG", "GIF", "WEBP", "TIFF", "PSD", "RAW", "BMP", "HEIF", "INDD", "JPEG", "SVG", "AI", "EPS", "PDF"].includes(fileType)) {
      imagePath = "https://www.pngrepo.com/png/141793/170/image-file.png";
    }
    else if (["HTML", "MD", "CSS", "TXT"].includes(fileType)) {
      imagePath = "https://icon-library.net/images/file-icon-png/file-icon-png-23.jpg";
    }
    else {
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
    setTimeout(function(){ itemToHighlight.classList.remove("highlight-pulsate") }, 1000);
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
      if (graphData[i].cont > max){
        max = graphData[i].cont
      }
    }

    //select the svg container and append an object and translate it to leave margin on top and left
    var svg = d3.select("#" + elementId);
    var chart = svg.append("g").attr("transform", "translate(" + margin + "," + margin + ")")

    //set the color scheme for the data
    var color = d3.scaleOrdinal().range(["#247BA0","#70C1B3","#B2DBBF","#F3FFBD","#FF1654",'#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D','#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC','#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399', '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933', '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF']);

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
        .on("mouseenter",function(s, i){
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
              .attr("x1",0)
              .attr("y1", y)
              .attr("x2",width)
              .attr("y2", y)
              .attr("stroke","#D85F7D")
              .style("stroke-dasharray","5,5");
          chart
              .append("text")
              .attr("id","contNum")
              .attr("x", width + 20)
              .attr("y", y + 4)
              .attr("text-anchor","middle")
              .text(s.cont + " lines")
              .attr("font-size", "10px")})
        //add a function to remove any changes when cursor leave the bar
        .on("mouseleave",function(actual, i){
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
              .remove();});

    //add label to y axis
    svg.append("text").attr("x", -(height / 2) - margin).attr("y", margin / 2.4).attr("transform", "rotate(-90)").attr("text-anchor","middle").text("Number of Lines Contributed").attr("font-size", "11px");

    //add label to the x axis
    svg.append("text").attr("x", width / 2 + margin).attr("y", height + 2 * margin - 20).attr("text-anchor","middle").text("Names of Contributors").attr("font-size", "11px")
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
    var color = d3.scaleOrdinal().range(["#247BA0","#70C1B3","#B2DBBF","#F3FFBD","#FF1654",'#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D','#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC','#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399', '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933', '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF']);

    //append svg to the body tag in html and then append an object and translate it to middle
    var svg = d3
        .select("." + gridElementClass)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background", "white")
        .append("g")
        .attr("transform","translate(" + width/2 + "," + height/2 + ")");

    //find the total number of lines contributed
    for (i = 0; i < chartData.length; i++) {
      total = total + chartData[i].cont;
    }

    //find the percentage of contribution and append as a property
    for (i = 0; i < chartData.length; i++) {
      number = (chartData[i].cont / total) * 100;
      chartData[i].perc = Math.round( number * 10 ) / 10;
    }

    //bind the data to a piechart in d3
    var data = d3
        .pie()
        .sort(null)
        .value(function(d){return d.perc;})(chartData);

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
        .attr("fill", function(d,i){return color(d.data.name);})

    //add a legend to the middle of the donut chart
    var legend = svg
        .selectAll(".legend")
        .data(color.domain())
        .enter()
        .append("g")
        .attr("class","legend")
        .attr("transform",function(d,i){
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
        .attr("height",legRectSize)
        .style("fill", color)
        .style("stroke", color);

    //add text to the legend for names and percentages
    legend
        .append("text")
        .attr("x", legRectSize + legSpacing)
        .attr("y",legRectSize - legSpacing + 4)
        .text(function(d, i){return color.domain()[i] + " - " + chartData[i].perc + "%";});
  }

  $("#getReposButton").on("click", getRepos);

  // On page load
  getRepos();
  getFiles("test");
});