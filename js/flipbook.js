// Single Page PDF Flipbook Reader
class SinglePageFlipbookReader {
    constructor() {
        this.pdf = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.isLoading = false;
        this.pages = new Map(); // Store rendered pages
        this.scale = 1.5;
        
        // Touch handling
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.touchThreshold = 50;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPDF();
    }

    async loadPDF() {
        try {
            this.isLoading = true;
            this.showLoading();
            
            // Load PDF using PDF.js
            const loadingTask = pdfjsLib.getDocument('assets/pdf/linear-algebra-free-version.pdf');
            this.pdf = await loadingTask.promise;
            this.totalPages = this.pdf.numPages;
            
            console.log(`PDF loaded: ${this.totalPages} pages`);
            
            await this.initializeFlipbook();
            this.isLoading = false;
            this.hideLoading();
            this.updateControls();
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showError('Gagal memuat PDF. Pastikan file ada di lokasi yang benar.');
        }
    }

    async initializeFlipbook() {
        const container = document.querySelector('.page-container');
        container.innerHTML = `
            <button class="nav-arrow nav-prev" id="nav-prev">‹</button>
            <div class="page" id="current-page">
                <div class="page-content"></div>
                <div class="page-number"></div>
            </div>
            <button class="nav-arrow nav-next" id="nav-next">›</button>
            <div class="touch-indicator touch-prev">‹</div>
            <div class="touch-indicator touch-next">›</div>
        `;

        await this.renderCurrentPage();
    }

    async renderPage(pageNum, targetElement) {
        if (this.pages.has(pageNum)) {
            const cachedCanvas = this.pages.get(pageNum);
            targetElement.appendChild(cachedCanvas.cloneNode(true));
            return;
        }

        try {
            const page = await this.pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            
            // Cache the rendered page
            this.pages.set(pageNum, canvas.cloneNode(true));
            
            // Add to target element
            targetElement.appendChild(canvas);
            
        } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
            this.showPageError(targetElement, pageNum);
        }
    }

    async renderCurrentPage() {
        const pageElement = document.getElementById('current-page');
        const pageContent = pageElement.querySelector('.page-content');
        const pageNumber = pageElement.querySelector('.page-number');

        // Clear previous content
        pageContent.innerHTML = '';
        pageNumber.textContent = '';

        if (this.currentPage <= this.totalPages) {
            await this.renderPage(this.currentPage, pageContent);
            pageNumber.textContent = this.currentPage.toString();
        }
    }

    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isModalOpen()) return;
            
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
        });

        // Touch/swipe support
        document.addEventListener('touchstart', (e) => {
            if (!this.isModalOpen()) return;
            this.touchStartX = e.touches[0].clientX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!this.isModalOpen()) return;
            this.touchEndX = e.changedTouches[0].clientX;
            this.handleSwipe();
        }, { passive: true });

        // Navigation arrows
        document.addEventListener('click', (e) => {
            if (e.target.id === 'nav-prev') {
                this.previousPage();
            } else if (e.target.id === 'nav-next') {
                this.nextPage();
            } else if (e.target.id === 'prev-page') {
                this.previousPage();
            } else if (e.target.id === 'next-page') {
                this.nextPage();
            }
        });

        // Click on page area for navigation
        document.addEventListener('click', (e) => {
            if (!this.isModalOpen()) return;
            
            const pageElement = document.getElementById('current-page');
            if (!pageElement || !pageElement.contains(e.target)) return;

            const rect = pageElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const centerX = rect.width / 2;

            if (x < centerX) {
                this.previousPage();
                this.showTouchIndicator('prev');
            } else {
                this.nextPage();
                this.showTouchIndicator('next');
            }
        });
    }

    handleSwipe() {
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) > this.touchThreshold) {
            if (diff > 0) {
                // Swipe left - next page
                this.nextPage();
                this.showTouchIndicator('next');
            } else {
                // Swipe right - previous page
                this.previousPage();
                this.showTouchIndicator('prev');
            }
        }
    }

    async nextPage() {
        if (this.currentPage < this.totalPages && !this.isLoading) {
            this.animatePageFlip('next');
            this.currentPage++;
            await this.renderCurrentPage();
            this.updateControls();
        }
    }

    async previousPage() {
        if (this.currentPage > 1 && !this.isLoading) {
            this.animatePageFlip('prev');
            this.currentPage--;
            await this.renderCurrentPage();
            this.updateControls();
        }
    }

    animatePageFlip(direction) {
        const pageElement = document.getElementById('current-page');
        
        if (direction === 'next') {
            pageElement.classList.add('flipping-next');
            setTimeout(() => {
                pageElement.classList.remove('flipping-next');
            }, 600);
        } else {
            pageElement.classList.add('flipping-prev');
            setTimeout(() => {
                pageElement.classList.remove('flipping-prev');
            }, 600);
        }
    }

    showTouchIndicator(direction) {
        const indicator = document.querySelector(`.touch-${direction}`);
        if (indicator) {
            indicator.classList.add('show');
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 300);
        }
    }

    updateControls() {
        const prevBtn = document.getElementById('nav-prev');
        const nextBtn = document.getElementById('nav-next');
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        if (prevBtn) prevBtn.disabled = this.currentPage === 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
        if (prevPageBtn) prevPageBtn.disabled = this.currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = this.currentPage >= this.totalPages;

        if (pageInfo) {
            pageInfo.textContent = `Halaman ${this.currentPage} dari ${this.totalPages}`;
        }
    }

    showLoading() {
        const container = document.querySelector('.page-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-page">
                    <div class="loading-spinner"></div>
                    <p>Memuat PDF...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be hidden when initializeFlipbook runs
    }

    showError(message) {
        const container = document.querySelector('.page-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-page">
                    <p style="color: #e74c3c; text-align: center; padding: 20px;">
                        ${message}
                    </p>
                </div>
            `;
        }
    }

    showPageError(element, pageNum) {
        element.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">
                <p>Error loading page ${pageNum}</p>
            </div>
        `;
    }

    isModalOpen() {
        const modal = document.getElementById('flipbook-modal');
        return modal && modal.classList.contains('active');
    }
}

// Initialize flipbook reader
let flipbookReader;

// Modal functions
function openFlipbook() {
    const modal = document.getElementById('flipbook-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Initialize flipbook reader if not already done
        if (!flipbookReader) {
            flipbookReader = new SinglePageFlipbookReader();
        }
    }
}

function closeFlipbook() {
    const modal = document.getElementById('flipbook-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // PDF.js worker setup
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
});
