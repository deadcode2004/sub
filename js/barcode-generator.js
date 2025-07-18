document.addEventListener('DOMContentLoaded', function () {

    const generatorForm = document.getElementById('generatorForm');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const prefixInput = document.getElementById('prefix');
    const startNumberInput = document.getElementById('startNumber');
    const quantityInput = document.getElementById('quantity');

    generatorForm.addEventListener('submit', function (event) {
        event.preventDefault();
        loadingIndicator.classList.remove('d-none');

        const prefix = prefixInput.value.trim();
        const startNumber = parseInt(startNumberInput.value, 10);
        const quantity = parseInt(quantityInput.value, 10);

        // Use a timeout to allow the UI to update and show the loader
        setTimeout(() => {
            try {
                generatePdf(prefix, startNumber, quantity);
            } catch (error) {
                console.error('An error occurred during PDF generation:', error);
                alert('حدث خطأ أثناء إنشاء الملف. يرجى مراجعة وحدة التحكم.');
            } finally {
                loadingIndicator.classList.add('d-none');
            }
        }, 50);
    });

    function generatePdf(prefix, startNumber, quantity) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const page = {
            width: 210,
            height: 297,
            margin: 10,
            cols: 3,
            rows: 10
        };

        const card = {
            width: (page.width - page.margin * 2) / page.cols,
            height: (page.height - page.margin * 2) / page.rows
        };

        let x = page.margin;
        let y = page.margin;
        let count = 0;

        for (let i = 0; i < quantity; i++) {
            if (count > 0 && count % (page.cols * page.rows) === 0) {
                doc.addPage();
                x = page.margin;
                y = page.margin;
            }

            const barcodeValue = `${prefix}${String(startNumber + i).padStart(7, '0')}`;
            const canvas = document.createElement('canvas');
            JsBarcode(canvas, barcodeValue, {
                format: 'CODE128',
                width: 1.5,
                height: 30,
                fontSize: 14,
                margin: 5
            });

            const canvasImg = canvas.toDataURL('image/jpeg', 1.0);
            const barcodeWidth = 50; // mm
            const barcodeHeight = 15; // mm

            const cardX = x + (card.width - barcodeWidth) / 2;
            const cardY = y + (card.height - barcodeHeight) / 2;

            doc.addImage(canvasImg, 'JPEG', cardX, cardY, barcodeWidth, barcodeHeight);
            doc.setFontSize(8);
            doc.text(barcodeValue, cardX + barcodeWidth / 2, cardY + barcodeHeight + 4, { align: 'center' });

            x += card.width;
            if ((i + 1) % page.cols === 0) {
                x = page.margin;
                y += card.height;
            }
            count++;
        }

        doc.save(`barcodes_${startNumber}-${startNumber + quantity - 1}.pdf`);
    }
});
