// Advanced flipbook functionality
class FlipbookReader {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.isReading = false;
    }

    init() {
        this.setupEventListeners();
        this.createFlipbookInterface();
    }

    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isReading) {
                switch(e.key) {
                    case 'ArrowLeft':
                        this.previousPage();
                        break;
                    case 'ArrowRight':
                        this.nextPage();
                        break;
                    case 'Escape':
                        closeFlipbook();
                        break;
                }
            }
        });

        // Touch/swipe support for mobile
        let startX = 0;
        let endX = 0;

        document.addEventListener('touchstart', (e) => {
            if (this.isReading) {
                startX = e.touches[0].clientX;
            }
        });

        document.addEventListener('touchend', (e) => {
            if (this.isReading) {
                endX = e.changedTouches[0].clientX;
                this.handleSwipe();
            }
        });
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const diff = startX - endX;

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next page
                this.nextPage();
            } else {
                // Swipe right - previous page
                this.previousPage();
            }
        }
    }

    createFlipbookInterface() {
        // This would be enhanced with actual PDF.js integration
        // For now, we'll use a simple iframe approach
        this.updateInterface();
    }

    updateInterface() {
        // Update page counter, navigation buttons, etc.
        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            pageInfo.textContent = `Halaman ${this.currentPage} dari ${this.totalPages}`;
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updateInterface();
            this.animatePageTurn('next');
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updateInterface();
            this.animatePageTurn('prev');
        }
    }

    animatePageTurn(direction) {
        // Add page turning animation
        const viewer = document.querySelector('.flipbook-viewer');
        if (viewer) {
            viewer.style.transform = direction === 'next' ? 'rotateY(-5deg)' : 'rotateY(5deg)';
            
            setTimeout(() => {
                viewer.style.transform = 'rotateY(0deg)';
            }, 300);
        }
    }

    startReading() {
        this.isReading = true;
        this.updateInterface();
    }

    stopReading() {
        this.isReading = false;
    }
}

// Initialize flipbook reader
const flipbookReader = new FlipbookReader();

// Override openFlipbook function to integrate with FlipbookReader
function openFlipbook() {
    const modal = document.getElementById('flipbook-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    flipbookReader.startReading();
}

function closeFlipbook() {
    const modal = document.getElementById('flipbook-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    flipbookReader.stopReading();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    flipbookReader.init();
});
