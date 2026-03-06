const accesskey = "M6TJBtHgrKtH5e4PKgrzfNDTV3fQJK1VDTHdZnjZQRc";

const searchForm = document.getElementById("search-form");
const searchBox = document.getElementById("search-box");
const searchResult = document.getElementById("search-result");
const showMoreBtn = document.getElementById("show-more-btn"); // Note: You had 'search-more-btn', make sure HTML ID matches

let keyword = "";
let page = 1;

async function searchImages(){
    keyword = searchBox.value;
    // --- FIX IS HERE: Changed ' ' to ` ` (backticks) ---
    const url = `https://api.unsplash.com/search/photos?page=${page}&query=${keyword}&client_id=${accesskey}&per_page=15`;
    // ---------------------------------------------------
    
    // Check if the keyword is empty before fetching
    if (!keyword) {
        searchResult.innerHTML = "Please enter a search keyword.";
        showMoreBtn.style.display = "none";
        return;
    }


    const response = await fetch(url);

    // Check for bad response status (like 401 Unauthorized or 404 Not Found)
    if (!response.ok) {
        searchResult.innerHTML = `Error: ${response.status} - Could not fetch images. Check your access key.`;
        showMoreBtn.style.display = "none";
        return;
    }

    const data = await response.json();

    if(page === 1){
        searchResult.innerHTML = ""; // Clear results only on the first page load
    }

    const results = data.results;

    if (results.length === 0 && page === 1) {
        searchResult.innerHTML = "No images found for this keyword.";
        showMoreBtn.style.display = "none";
        return;
    }
    
    results.map((result) =>{
        const image = document.createElement("img");
        image.src = result.urls.small;
        const imageLink =document.createElement("a");
        
        // --- SECOND FIX: 'result.links.html' not 'results.link.html' ---
        imageLink.href = result.links.html;
        // ---------------------------------------------------------------
        
        imageLink.target ="_blank";

        imageLink.appendChild(image);
        searchResult.appendChild(imageLink);
    })

    showMoreBtn.style.display = "block";
}

// Ensure the button ID in your HTML is "search-more-btn" OR update the const name above to "showMoreBtn"
// I assumed the const name `showMoreBtn` is correct and updated the listener name.
searchForm.addEventListener("submit", (e) =>{
    e.preventDefault();
    page = 1;
    searchImages();
})

showMoreBtn.addEventListener("click", () =>{
    page++;
    searchImages();
})