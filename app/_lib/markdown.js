"use client";
export function markdown() {
    let lastLeftRatio = 0.5;
    const divider = document.getElementById('split-divider');
    const leftPane = document.getElementById('edit');
    const rightPane = document.getElementById('preview');
    const container = document.getElementById('container');

    if (!divider || !leftPane || !rightPane || !container) return;

    let isDragging = false;

    const onMouseDown = () => {
        isDragging = true;
        divider.classList.add('active');
        document.body.style.cursor = 'col-resize';
    };

    const onDblClick = () => {
        const containerRect = container.getBoundingClientRect();
        const totalWidth = containerRect.width;
        const dividerWidth = divider.offsetWidth;
        const halfWidth = (totalWidth - dividerWidth) / 2;

        leftPane.style.width = halfWidth + 'px';
        rightPane.style.width = halfWidth + 'px';
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        document.body.style.userSelect = 'none';
        const containerRect = container.getBoundingClientRect();
        const totalWidth = containerRect.width;
        const offsetX = e.clientX - containerRect.left;
        const dividerWidth = divider.offsetWidth;

        const minWidth = 100;
        const maxWidth = totalWidth - minWidth - dividerWidth;
        const leftWidth = Math.max(minWidth, Math.min(offsetX, maxWidth));
        leftPane.style.width = leftWidth + 'px';
        rightPane.style.width = (totalWidth - leftWidth - dividerWidth) + 'px';
        lastLeftRatio = leftWidth / (totalWidth - dividerWidth);
    };

    const onMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            divider.classList.remove('active');
            divider.classList.remove('hover');
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        }
    };

    const onResize = () => {
        const containerRect = container.getBoundingClientRect();
        const totalWidth = containerRect.width;
        const dividerWidth = divider.offsetWidth;
        const availableWidth = totalWidth - dividerWidth;

        const newLeft = availableWidth * lastLeftRatio;
        const newRight = availableWidth * (1 - lastLeftRatio);

        leftPane.style.width = newLeft + 'px';
        rightPane.style.width = newRight + 'px';
    };

    divider.addEventListener('mousedown', onMouseDown);
    divider.addEventListener('dblclick', onDblClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onResize);

    return () => {
        divider.removeEventListener('mousedown', onMouseDown);
        divider.removeEventListener('dblclick', onDblClick);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('resize', onResize);
    };
}