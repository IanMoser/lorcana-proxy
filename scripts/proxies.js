document.addEventListener("DOMContentLoaded", async function () {
    const cardsContainer = document.getElementById("cardsContainer");
    const cardSelectionContainer = document.getElementById("cardSelectionContainer");
    const searchQueryInput = document.getElementById("searchQuery");
    const searchContainer = document.getElementById("searchContainer");
    const addCardButton = document.getElementById("addCardButton");
    const printButton = document.getElementById("printButton");
    const importButton = document.getElementById("importButton");
    const importContainer = document.getElementById("importContainer");
    const importText = document.getElementById("importText");
    const doImportButton = document.getElementById("doImportButton");

    let proxiedCards = [];

    printButton.addEventListener("click", () => {
        window.print();
    });

    addCardButton.addEventListener("click", async () => {
        searchContainer.showModal()
    })

    searchContainer.querySelector('[data-role=close]').addEventListener('click', () => {
        searchContainer.close()
        searchQueryInput.value = ""
        cardSelectionContainer.innerHTML = "";
    })

    const addCardToContainer = (card, container) => {
        const cardElement = document.createElement("div");
        cardElement.classList.add("card");
        if (card.type.includes("Location")) {
            cardElement.classList.add("location");
        }

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "x";
        deleteButton.classList.add("delete-button");
        deleteButton.classList.add("display-only");

        const imgElement = document.createElement("img");
        imgElement.src = card.image_uris.digital.large;

        cardElement.appendChild(imgElement);
        cardElement.appendChild(deleteButton);
        container.appendChild(cardElement);

        cardElement.addEventListener("click", () => {
            // Remove a single instance off the card in the proxied cards
            const index = proxiedCards.findIndex(c => c.id === card.id);
            proxiedCards.splice(index, 1);

            // Remove the card from the container
            cardElement.remove();
        });
    }

    const renderCards = () => {
        // sort cards by name and id
        const sortedCards = proxiedCards.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return a.id - b.id;
        });

        cardsContainer.innerHTML = "";
        sortedCards.forEach((card) => {
            addCardToContainer(card, cardsContainer)
        });
    }

    // Cache the latest search query
    let currentSearchQuery = "";
    searchQueryInput.addEventListener("input", async () => {
       const searchQuery = searchQueryInput.value;
       currentSearchQuery = searchQuery;
       fetch(`https://api.lorcast.com/v0/cards/search?q=${searchQuery}`)
          .then(response => response.json())
          .then(data => {
            if (currentSearchQuery !== searchQuery) {
                return;
            }

            cardSelectionContainer.innerHTML = "";

            const cards = data.results;
            cards.forEach((card) => {
                const cardElement = document.createElement("div");
                let cardCount = proxiedCards.filter(c => c.id === card.id).length;
                cardElement.classList.add("card");
                if (card.type.includes("Location")) {
                    cardElement.classList.add("location");
                }

                const imgElement = document.createElement("img");
                imgElement.src = card.image_uris.digital.large;


                const cardCountElement = document.createElement("h2");
                cardCountElement.classList.add("card-count");
                cardCountElement.textContent = cardCount;

                cardElement.appendChild(cardCountElement);
                cardElement.appendChild(imgElement);
                cardSelectionContainer.appendChild(cardElement);
                cardElement.addEventListener("click", () => {
                    proxiedCards.push(card);

                    cardCount++;
                    cardCountElement.textContent = cardCount;

                    addCardToContainer(card, cardsContainer);
                });
            });
              });
    });

    importButton.addEventListener("click", () => {
        importContainer.showModal();
    });

    importContainer.querySelector('[data-role=close]').addEventListener('click', () => {
        importContainer.close();
    });

    doImportButton.addEventListener("click", async () => {
        const lines = importText.value.split("\n");
        importContainer.close();

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const match = line.match(/^(\d+)\s+(.+)$/);
            if (match) {
                const count = parseInt(match[1], 10);
                const name = match[2].trim();

                try {
                    let response = await fetch(`https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent(name)}`);
                    let data = await response.json();

                    // If no results found and the name looks like "Name - Version", try searching just the Name
                    if ((!data.results || data.results.length === 0) && name.includes(" - ")) {
                        const simpleName = name.split(" - ")[0].trim();
                        response = await fetch(`https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent(simpleName)}`);
                        data = await response.json();
                    }

                    if (data.results && data.results.length > 0) {
                        let card = data.results[0];

                        const lowerName = name.toLowerCase();
                        const exactMatch = data.results.find(c => {
                            const cName = c.name.toLowerCase();
                            const cFullName = c.version ? `${cName} - ${c.version.toLowerCase()}` : cName;
                            return cName === lowerName || cFullName === lowerName;
                        });

                        if (exactMatch) card = exactMatch;

                        for (let i = 0; i < count; i++) {
                            proxiedCards.push(card);
                            addCardToContainer(card, cardsContainer);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch", name, e);
                }
            }
        }
    });
})