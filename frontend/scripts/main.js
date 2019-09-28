// Function headers

function expandFile() {}
function returnToRepos() {}

$(document).ready(function() {
  // All code goes in this function to ensure JQuery and the page are ready before JS code is run

  const isDev = true;
  const apiUrl = isDev ? `http://localhost:3000/api` : `https://devalarm.com/api`;

  let gridItemInfo = "";
  function getRepoFiles(repository) {
    if (repository.classList.length === 0) {
      repository.setAttribute("class", "active");
    }
    else {
      repository.className = "";
    }
  }

  expandFile = (gridItem) => {
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
    let repoFIleMsnry = new Masonry(repoGrid, {
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
    repoFIleMsnry.layout();

    // create detail grid
    let detailGrid = document.createElement("div");
    detailGrid.className = "grid slide-in-bck";
    detailGrid.id = "fileDetails";
    detailGrid.setAttribute("data-masonry", '{ "itemSelector": ".grid-item", "columnWidth": 200, "gutter": 60, "originLeft": true }');
    let fileDetailMsnry = new Masonry(detailGrid, {
      // options
      itemSelector: '.grid-item',
      columnWidth: 200,
      gutter: 60,
      originLeft: true
    });

    // add grid to page
    let gridArea = document.getElementsByClassName("repo-information")[0];
    gridArea.prepend(detailGrid);

    // create detail grid elements
    let detailGridItem1 = document.createElement("div");
    detailGridItem1.className = "grid-item file-detail";
    detailGridItem1.innerHTML = "<h1>Graph</h1><img alt='example graph' src='https://i.pinimg.com/originals/1d/b2/fe/1db2fe7e19861900a2d9260cd1272727.jpg' style='height: 300px;'>";

    // add detail elements to grid
    detailGrid.appendChild(detailGridItem1);
    fileDetailMsnry.appended(detailGridItem1);

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
    let repoFIleMsnry = new Masonry(repoFileGrid, {
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
    repoFIleMsnry.appended(newGridItem);

    // make file detail grid hidden
    let detailGrid = document.getElementById("fileDetails");
    detailGrid.className = "grid slide-out-bck";
    document.getElementsByClassName("repo-information")[0].removeChild(detailGrid);

    // make repo grid visible
    repoFileGrid.className = "grid slide-in-bck";

    // refresh repo grid layout
    repoFIleMsnry.layout();

  }

  function getRepos() {
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

  function repositoryResponse(userData) {
    try {
      alert(userData[0].name);
    }
    catch (e) {
      alert("Error: " + userData.data.message);
    }
  }

  $("#getReposButton").on("click", getRepos);

  // On page load
  getRepos();

});