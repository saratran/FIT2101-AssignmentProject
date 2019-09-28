// Function headers

function expandFile() {}
function returnToRepos() {}
function getRepos() {}
function getFiles(reponame) {}
function getFileIcon() {}
function getContributorInfo() {}
function highlightFile() {}
function goToUserPage() {}


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
    let detailGridItem2 = document.createElement("div");
    detailGridItem1.className = "grid-item file-detail";
    detailGridItem1.id = "Graph";
    detailGridItem2.className = "grid-item file-detail contributor-table";
    detailGridItem2.id = fileName + " Contributors";
    detailGridItem1.innerHTML = "<h1>Graph</h1><img alt='example graph' src='https://i.pinimg.com/originals/1d/b2/fe/1db2fe7e19861900a2d9260cd1272727.jpg' style='height: 300px;'>";
    detailGridItem2.innerHTML = "<h1>" + fileName + " Contributors</h1>";

    // add detail elements to grid
    detailGrid.appendChild(detailGridItem1);
    detailGrid.appendChild(detailGridItem2);
    fileDetailMsnry.appended(detailGridItem1);
    fileDetailMsnry.appended(detailGridItem2);

    // add contributor table to grid item
    getContributorInfo(repoName, fileName, "contributor-table");

    // add detail references to sidebar
    let gridItem1Reference = document.createElement("a");
    let gridItem2Reference = document.createElement("a");
    gridItem1Reference.innerHTML = detailGridItem1.id;
    gridItem2Reference.innerHTML = detailGridItem2.id;
    gridItem1Reference.setAttribute("onclick", "highlightFile(this)");
    gridItem2Reference.setAttribute("onclick", "highlightFile(this)");
    newSidebar.appendChild(gridItem1Reference);
    newSidebar.appendChild(gridItem2Reference);

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
    fetch(apiUrl + `/files-mock/${repoName}`).then(fetchRes => {
      fetchRes.json().then(json => {
        json.forEach(file => {
          if (file.filename === fileName) {
            let contributorInfo = document.createElement("table");
            let tableHeader = document.createElement("tr");
            let tableHeader1 = document.createElement("th");
            let tableHeader2 = document.createElement("th");
            let tableHeader3 = document.createElement("th");
            tableHeader1.innerHTML = "Name";
            tableHeader2.innerHTML = "Username";
            tableHeader3.innerHTML = "Contact Information";

            tableHeader.className = "header";
            tableHeader.appendChild(tableHeader1);
            tableHeader.appendChild(tableHeader2);
            tableHeader.appendChild(tableHeader3);

            contributorInfo.appendChild(tableHeader);

            file.otherContributors.forEach(contributor => {
              let newContributor = document.createElement("tr");
              let contributorName = document.createElement("td");
              let userName = document.createElement("td");
              let contactInfo = document.createElement("td");
              contributorName.innerHTML = `${contributor.name}`;
              userName.innerHTML = `${contributor.username}`;
              contactInfo.innerHTML = `${contributor.email}`;

              newContributor.id = userName.innerHTML
              newContributor.setAttribute("onclick", "goToUserPage(this)")
              newContributor.appendChild(contributorName);
              newContributor.appendChild(userName);
              newContributor.appendChild(contactInfo);

              contributorInfo.appendChild(newContributor);
            });

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
    window.scrollTo({
      top: itemToHighlight.getBoundingClientRect().top - 70,
      behavior: "smooth"
    });

    itemToHighlight.classList.add("highlight-pulsate");

    setTimeout(function(){ itemToHighlight.classList.remove("highlight-pulsate") }, 1000);

  }

  goToUserPage = (username) => {
    let pageName = username.id;
    var win = window.open("https://github.com/" + pageName, '_blank');
    win.focus();
  }

  $("#getReposButton").on("click", getRepos);

  // On page load
  getRepos();
  getFiles("test");
});