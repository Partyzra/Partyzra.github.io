/* Shared portfolio JavaScript */
(function () {
    const modal = document.getElementById('photoModal');
    if (!modal) return;

    const images = Array.from(document.querySelectorAll('.photo-img'));
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const closeBtn = document.getElementById('modalCloseBtn');
    const prevBtn = document.getElementById('modalPrev');
    const nextBtn = document.getElementById('modalNext');
    let currentIndex = 0;

    function render(index) {
        currentIndex = (index + images.length) % images.length;
        const image = images[currentIndex];
        modalImage.src = image.dataset.full || image.src;
        modalImage.alt = image.alt || 'Expanded photo';
        modalCaption.textContent = image.alt || '';
        prevBtn.hidden = images.length < 2;
        nextBtn.hidden = images.length < 2;
    }

    window.openModal = function (img) {
        const index = images.indexOf(img);
        render(index >= 0 ? index : 0);
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        closeBtn.focus();
    };

    window.closeModal = function () {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        modalImage.src = '';
        document.body.classList.remove('modal-open');
    };

    window.handleKeyOpen = function (event, img) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.openModal(img);
        }
    };

    closeBtn.addEventListener('click', window.closeModal);
    prevBtn.addEventListener('click', function () { render(currentIndex - 1); });
    nextBtn.addEventListener('click', function () { render(currentIndex + 1); });

    modal.addEventListener('click', function (event) {
        if (event.target === modal) window.closeModal();
    });

    document.addEventListener('keydown', function (event) {
        if (!modal.classList.contains('is-open')) return;
        if (event.key === 'Escape') window.closeModal();
        if (event.key === 'ArrowLeft') render(currentIndex - 1);
        if (event.key === 'ArrowRight') render(currentIndex + 1);
    });
})();
