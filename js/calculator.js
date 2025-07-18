document.addEventListener('DOMContentLoaded', () => {
    const displayResult = document.getElementById('displayResult');
    const displayHistory = document.getElementById('displayHistory');
    const buttons = document.querySelector('.buttons-grid');

    let currentInput = '0';
    let operator = null;
    let previousInput = null;
    let history = '';

    function updateDisplay() {
        displayResult.textContent = currentInput;
        displayHistory.textContent = history;
    }

    function handleNumberClick(num) {
        if (currentInput === '0') {
            currentInput = num;
        } else {
            currentInput += num;
        }
    }

    function handleOperatorClick(op) {
        if (operator && previousInput !== null) {
            calculate();
        }
        operator = op;
        previousInput = currentInput;
        history = `${currentInput} ${operator}`;
        currentInput = '0';
    }

    function calculate() {
        if (operator === null || previousInput === null) return;

        const prev = parseFloat(previousInput);
        const current = parseFloat(currentInput);
        let result = 0;

        switch (operator) {
            case '+':
                result = prev + current;
                break;
            case '-':
                result = prev - current;
                break;
            case '*':
                result = prev * current;
                break;
            case '/':
                if (current === 0) {
                    alert('لا يمكن القسمة على صفر');
                    clearAll();
                    return;
                }
                result = prev / current;
                break;
        }

        history = `${previousInput} ${operator} ${currentInput} =`;
        currentInput = String(result);
        operator = null;
        previousInput = null;
    }

    function clearAll() {
        currentInput = '0';
        operator = null;
        previousInput = null;
        history = '';
    }

    function backspace() {
        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = '0';
        }
    }

    buttons.addEventListener('click', (e) => {
        const target = e.target;
        if (!target.matches('button')) return;

        const value = target.dataset.value;
        const type = target.dataset.type;

        switch (type) {
            case 'number':
                handleNumberClick(value);
                break;
            case 'operator':
                handleOperatorClick(value);
                break;
            case 'equals':
                calculate();
                break;
            case 'clear':
                clearAll();
                break;
            case 'backspace':
                backspace();
                break;
            case 'decimal':
                if (!currentInput.includes('.')) {
                    currentInput += '.';
                }
                break;
        }
        updateDisplay();
    });

    updateDisplay();
});
