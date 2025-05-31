// Enhanced flipbook functionality with PDF.js integration
class PDFFlipbookReader {
    constructor() {
        this.pdf = null;
        this.currentSpread = 0; // 0 = cover, 1 = pages 1-2, 2 = pages 3-4, etc.
        this.totalPages = 0;
        this.totalSpreads = 0;
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
            this.totalSpreads = Math.ceil(this.totalPages / 2);
            
            console.log(`PDF loaded: ${this.totalPages} pages, ${this.totalSpreads} spreads`);
            
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
        const container = document.querySelector('.book-container');
        container.innerHTML = `
            <div class="book-spine"></div>
            <div class="page page-left" id="page-left">
                <div class="page-content"></div>
                <div class="page-number"></div>
            </div>
            <div class="page page-right" id="page-right">
                <div class="page-content"></div>
                <div class="page-number"></div>
            </div>
            <div class="touch-indicator touch-prev">‹</div>
            <div class="touch-indicator touch-next">›</div>
        `;

        await this.renderCurrentSpread();
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

    async renderCurrentSpread() {
        const leftPage = document.getElementById('page-left');
        const rightPage = document.getElementById('page-right');
        const leftContent = leftPage.querySelector('.page-content');
        const rightContent = rightPage.querySelector('.page-content');
        const leftNumber = leftPage.querySelector('.page-number');
        const rightNumber = rightPage.querySelector('.page-number');

        // Clear previous content
        leftContent.innerHTML = '';
        rightContent.innerHTML = '';
        leftNumber.textContent = '';
        rightNumber.textContent = '';

        if (this.currentSpread === 0) {
            // Cover page
            await this.renderPage(1, leftContent);
            leftNumber.textContent = '1';
            
            if (this.totalPages > 1) {
                await this.renderPage(2, rightContent);
                rightNumber.textContent = '2';
            }
        } else {
            // Calculate page numbers for current spread
            const leftPageNum = (this.currentSpread - 1) * 2 + 3; // Start from page 3
            const rightPageNum = leftPageNum + 1;

            if (leftPageNum <= this.totalPages) {
                await this.renderPage(leftPageNum, leftContent);
                leftNumber.textContent = leftPageNum.toString();
            }

            if (rightPageNum <= this.totalPages) {
                await this.renderPage(rightPageNum, rightContent);
                rightNumber.textContent = rightPageNum.toString();
            }
        }
    }

    setupEventListeners() {
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isModalOpen()) return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    this.previousSpread();
                    break;
                case 'ArrowRight':
                    this.nextSpread();
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

        // Mouse navigation on book area
        document.addEventListener('click', (e) => {
            if (!this.isModalOpen()) return;
            
            const bookContainer = document.querySelector('.book-container');
            if (!bookContainer || !bookContainer.contains(e.target)) return;

            const rect = bookContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const centerX = rect.width / 2;

            if (x < centerX - 50) {
                this.previousSpread();
                this.showTouchIndicator('prev');
            } else if (x > centerX + 50) {
                this.nextSpread();
                this.showTouchIndicator('next');
            }
        });

        // Control buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'prev-spread') {
                this.previousSpread();
            } else if (e.target.id === 'next-spread') {
                this.nextSpread();
            }
        });
    }

    handleSwipe() {
        const diff = this.touchStartX - this.touchEndX;
        
        if (Math.abs(diff) > this.touchThreshold) {
            if (diff > 0) {
                // Swipe left - next spread
                this.nextSpread();
                this.showTouchIndicator('next');
            } else {
                // Swipe right - previous spread
                this.previousSpread();
                this.showTouchIndicator('prev');
            }
        }
    }

    async nextSpread() {
        if (this.currentSpread < this.totalSpreads && !this.isLoading) {
            this.animatePageFlip('next');
            this.currentSpread++;
            await this.renderCurrentSpread();
            this.updateControls();
        }
    }

    async previousSpread() {
        if (this.currentSpread > 0 && !this.isLoading) {
            this.animatePageFlip('prev');
            this.currentSpread--;
            await this.renderCurrentSpread();
            this.updateControls();
        }
    }

    animatePageFlip(direction) {
        const rightPage = document.getElementById('page-right');
        const leftPage = document.getElementById('page-left');
        
        if (direction === 'next') {
            rightPage.classList.add('flipping-right');
            setTimeout(() => {
                rightPage.classList.remove('flipping-right');
            }, 800);
        } else {
            leftPage.classList.add('flipping-left');
            setTimeout(() => {
                leftPage.classList.remove('flipping-left');
            }, 800);
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
        const prevBtn = document.getElementById('prev-spread');
        const nextBtn = document.getElementById('next-spread');
        const pageInfo = document.getElementById('page-info');

        if (prevBtn) prevBtn.disabled = this.currentSpread === 0;
        if (nextBtn) nextBtn.disabled = this.currentSpread >= this.totalSpreads;

        if (pageInfo) {
            const currentPageStart = this.currentSpread === 0 ? 1 : (this.currentSpread - 1) * 2 + 3;
            const currentPageEnd = Math.min(currentPageStart + 1, this.totalPages);
            pageInfo.textContent = `Halaman ${currentPageStart}${currentPageEnd > currentPageStart ? `-${currentPageEnd}` : ''} dari ${this.totalPages}`;
        }
    }

    showLoading() {
        const container = document.querySelector('.book-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-page">
                    <div class="loading-spinner"></div>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be hidden when initializeFlipbook runs
    }

    showError(message) {
        const container = document.querySelector('.book-container');
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

// Enhanced modal functions
function openFlipbook() {
    const modal = document.getElementById('flipbook-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Initialize flipbook reader if not already done
        if (!flipbookReader) {
            flipbookReader = new PDFFlipbookReader();
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
