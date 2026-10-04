document.addEventListener("DOMContentLoaded", function () {
    let searchBox = document.getElementById("teachertouchbar");
    if (!searchBox) return;

    searchBox.addEventListener("input", function () {
        let searchQuery = this.value.toLowerCase();
        let images = document.querySelectorAll("#roddyricchboxselect img");

        images.forEach(img => {
            img.style.display = img.alt.toLowerCase().includes(searchQuery) ? "" : "none";
        });
    });
});