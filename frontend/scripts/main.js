function loadRepositoryInfo() {
  // Get Github URL from page
  const owner = $("#inputOwner").val();
  const repo = $("#inputRepo").val();

  // Make fetch request to backend
  fetch(`http://localhost:3000/repo?owner=${owner}&repo=${repo}`).then(fetchRes => {
    fetchRes.json().then(fetchJson => {
      // Get reference to textarea
      $("#jsonOutput").text(JSON.stringify(fetchJson))
    })
  })
}
