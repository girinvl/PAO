window.Anubis = window.Anubis || {};

document.addEventListener("keydown", async function(e){
    // В полях формы Tab и стрелки должны работать нативно:
    // Tab переключает поля, стрелки двигают каретку/выбор.
    if (Anubis.isTypingInField && Anubis.isTypingInField()) {
        if (e.key === "Tab" || e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") {
            return;
        }
    }

    if (e.key === "v" || e.key === "V" || e.key === "м" || e.key === "М") {
        if (!Anubis.isTypingInField()) {
            e.preventDefault();
            await Anubis.moveSelectedBodyByVoice();
        }
        return;
    }

    if (e.key === "l" || e.key === "L" || e.key === "д" || e.key === "Д") {
        if (!Anubis.isTypingInField()) {
            e.preventDefault();
            await Anubis.setSelectedBodyHeightByVoice();
        }
        return;
    }

    if (e.code === "Space") {
        if (!Anubis.isTypingInField()) {
            e.preventDefault();
            await Anubis.handleSpaceMove();
        }
        return;
    }

    if (e.key === "1") {
        if (!Anubis.isTypingInField()) {
            e.preventDefault();
            await Anubis.changeStatusHotkey(1);
        }
        return;
    }

    if (e.key === "2") {
        if (!Anubis.isTypingInField()) {
            e.preventDefault();
            await Anubis.changeStatusHotkey(2);
        }
        return;
    }

    if (Anubis.modalIsOpen()) {
        if (e.key === "Escape") {
            e.preventDefault();
            Anubis.closeShelfModal();
            return;
        }

        if (e.key === "Enter") {
            const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();

            if (tag === "textarea" && !(e.ctrlKey || e.metaKey)) {
                return;
            }

            e.preventDefault();
            await Anubis.saveBody();
            return;
        }

        return;
    }

    if (e.key === "ArrowLeft") {
        e.preventDefault();
        Anubis.moveLeft();
        return;
    }

    if (e.key === "ArrowRight") {
        e.preventDefault();
        Anubis.moveRight();
        return;
    }

    if (e.key === "ArrowUp") {
        e.preventDefault();
        Anubis.moveUp();
        return;
    }

    if (e.key === "ArrowDown") {
        e.preventDefault();
        Anubis.moveDown();
        return;
    }

    if (e.key === "Enter") {
        e.preventDefault();
        await Anubis.openCurrent();
        return;
    }

    if (e.key === "Delete") {
        e.preventDefault();
        await Anubis.deleteCurrent();
    }
});

window.addEventListener("load", Anubis.initSelection);
