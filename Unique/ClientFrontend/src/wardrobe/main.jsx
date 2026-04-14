import { trigger } from '../lib/rage';
import './wardrobe.css';

const CATEGORIES = [
    { id: 'tops', label: 'Oberteile' },
    { id: 'legs', label: 'Hosen' },
    { id: 'feet', label: 'Schuhe' },
    { id: 'armor', label: 'Westen' },
    { id: 'outfits', label: 'Outfits' },
    { id: 'builder', label: 'Mein Stil' }
];

const BUILDER_COMPONENTS = [
    { id: 11, label: 'Oberteil' },
    { id: 8,  label: 'Shirt' },
    { id: 4,  label: 'Hose' },
    { id: 6,  label: 'Schuhe' },
    { id: 9,  label: 'Weste' }
];

const state = {
    visible: false,
    activeTab: 'tops',
    catalog: { items: [], outfits: [] },
    hoveredItem: null,
    builderComponents: {},
    myOutfits: []
};

function normalizeLabel(value, fallback) {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }

    if (value && typeof value === 'object') {
        if (typeof value.name === 'string' && value.name.trim()) {
            return value.name;
        }

        if (typeof value.label === 'string' && value.label.trim()) {
            return value.label;
        }
    }

    return fallback;
}

function normalizeItem(item) {
    const componentId = Number(item?.componentId);
    const drawableId = Number(item?.drawableId);
    const textureId = Number(item?.textureId);

    return {
        itemId: Number(item?.itemId ?? 0),
        factionId: Number(item?.factionId ?? 0),
        minRank: Number(item?.minRank ?? 1),
        componentId,
        drawableId,
        textureId,
        category: String(item?.category ?? ''),
        label: normalizeLabel(item?.label, `Item ${Number.isInteger(drawableId) ? drawableId : '?'}`)
    };
}

function normalizeOutfit(outfit) {
    return {
        outfitId: Number(outfit?.outfitId ?? 0),
        factionId: Number(outfit?.factionId ?? 0),
        category: String(outfit?.category ?? 'dienst'),
        name: normalizeLabel(outfit?.name, `Outfit ${Number(outfit?.outfitId ?? 0)}`),
        clothingJson: typeof outfit?.clothingJson === 'string' ? outfit.clothingJson : '[]'
    };
}

function ensureRoot() {
    const root = document.getElementById('root');
    if (!root) {
        throw new Error('wardrobe root not found');
    }
    return root;
}

function safeParseClothing(clothingJson) {
    try {
        const parsed = JSON.parse(clothingJson || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function getFilteredItems() {
    return Array.isArray(state.catalog.items)
        ? state.catalog.items.filter((item) => item.category === state.activeTab)
        : [];
}

function getOutfits() {
    return state.activeTab === 'outfits' && Array.isArray(state.catalog.outfits)
        ? state.catalog.outfits
        : [];
}

function previewItem(item) {
    const componentId = Number(item?.componentId);
    const drawableId = Number(item?.drawableId);
    const textureId = Number(item?.textureId);
    if (!Number.isInteger(componentId) || !Number.isInteger(drawableId) || !Number.isInteger(textureId)) {
        return;
    }

    state.hoveredItem = item;
    trigger('cef:wardrobe:previewItem', JSON.stringify({
        componentId,
        drawableId,
        textureId
    }));
    render();
}

function previewOutfit(outfit) {
    state.hoveredItem = outfit;
    trigger('cef:wardrobe:previewOutfit', JSON.stringify({
        outfitId: outfit.outfitId,
        clothing: safeParseClothing(outfit.clothingJson)
    }));
    render();
}

function clearPreview() {
    state.hoveredItem = null;
    trigger('cef:wardrobe:clearPreview');
    render();
}

function render() {
    const root = ensureRoot();
    if (!state.visible) {
        root.innerHTML = '';
        return;
    }

    const items = getFilteredItems();
    const outfits = getOutfits();
    const preview = state.hoveredItem
        ? `
            <div class="wardrobe-preview-card">
                <strong>${state.hoveredItem.name || state.hoveredItem.label || 'Vorschau'}</strong>
                <span>${String(state.hoveredItem.category || state.activeTab).toUpperCase()}</span>
            </div>
        `
        : '';

    const tabsHtml = CATEGORIES.map((cat) => `
        <button class="nav-item ${state.activeTab === cat.id ? 'active' : ''}" data-action="tab" data-tab="${cat.id}" type="button">
            <span class="label">${cat.label}</span>
        </button>
    `).join('');

    let cardsHtml = '';
    if (state.activeTab === 'builder') {
        const builderRows = BUILDER_COMPONENTS.map((comp) => {
            const info = state.builderComponents[comp.id] || { drawable: 0, texture: 0 };
            return `
                <div class="builder-row">
                    <span class="builder-comp-label">${comp.label}</span>
                    <div class="builder-controls">
                        <button class="builder-btn" data-action="prev-drawable" data-comp="${comp.id}" type="button">&#9664;</button>
                        <span class="builder-value">${info.drawable}</span>
                        <button class="builder-btn" data-action="next-drawable" data-comp="${comp.id}" type="button">&#9654;</button>
                        <span class="builder-sep">Tex</span>
                        <button class="builder-btn" data-action="prev-texture" data-comp="${comp.id}" type="button">&#9664;</button>
                        <span class="builder-value">${info.texture}</span>
                        <button class="builder-btn" data-action="next-texture" data-comp="${comp.id}" type="button">&#9654;</button>
                    </div>
                </div>
            `;
        }).join('');

        const savedOutfitsHtml = state.myOutfits.length === 0
            ? '<p class="builder-empty">Noch keine gespeicherten Outfits.</p>'
            : state.myOutfits.map((o) => `
                <div class="builder-saved-row">
                    <span class="builder-saved-name">${o.name}</span>
                    <div class="builder-saved-actions">
                        <button class="item-action primary" data-action="my-outfit-apply" data-outfit-id="${o.outfitId}" type="button">Anlegen</button>
                        <button class="item-action builder-delete" data-action="my-outfit-delete" data-outfit-id="${o.outfitId}" type="button">&#10005;</button>
                    </div>
                </div>
            `).join('');

        cardsHtml = `
            <div class="builder-panel">
                <div class="builder-section-title">Kleidung anpassen</div>
                ${builderRows}
                <div class="builder-save-row">
                    <input class="builder-name-input" id="builder-name-input" type="text" placeholder="Outfit-Name..." maxlength="32" />
                    <button class="item-action primary" data-action="builder-save" type="button">Speichern</button>
                </div>
                <div class="builder-section-title" style="margin-top:24px;">Gespeicherte Outfits</div>
                ${savedOutfitsHtml}
            </div>
        `;
    } else if (state.activeTab === 'outfits') {
        cardsHtml = `<div class="item-grid">${outfits.map((outfit) => `
            <div class="item-card outfit-card">
                <div class="item-info">
                    <h3>${outfit.name}</h3>
                    <p>${String(outfit.category).toUpperCase()}</p>
                </div>
                <div class="item-actions">
                    <button class="item-action secondary" data-action="preview-outfit" data-outfit-id="${outfit.outfitId}" type="button">Vorschau</button>
                    <button class="item-action primary" data-action="apply-outfit" data-outfit-id="${outfit.outfitId}" type="button">Ausrüsten</button>
                </div>
            </div>
        `).join('')}</div>`;
    } else {
        cardsHtml = `<div class="item-grid">${items.map((item) => `
            <div class="item-card">
                <div class="item-rank">Rang ${item.minRank}</div>
                <div class="item-info">
                    <h3>${item.label}</h3>
                    <p>${String(item.category).toUpperCase()}</p>
                </div>
                <div class="item-actions">
                    <button class="item-action secondary" data-action="preview-item" data-item-id="${item.itemId}" type="button">Vorschau</button>
                    <button class="item-action primary" data-action="apply-item" data-item-id="${item.itemId}" type="button">Ausrüsten</button>
                </div>
            </div>
        `).join('')}</div>`;
    }

    root.innerHTML = `
        <div class="wardrobe-overlay">
            <div class="wardrobe-container">
                <header class="wardrobe-header">
                    <div class="header-brand">
                        <div class="brand-dot"></div>
                        <h1>Kleidungskammer</h1>
                    </div>
                    <button class="close-btn" data-action="close" type="button">X</button>
                </header>
                <div class="wardrobe-content">
                    <nav class="wardrobe-sidebar">
                        ${tabsHtml}
                        <div class="sidebar-footer">
                            <button class="end-service-btn" data-action="end-service" type="button">
                                <span>Dienst beenden</span>
                            </button>
                        </div>
                    </nav>
                    <main class="wardrobe-main">
                        <div class="wardrobe-toolbar">
                            <span class="wardrobe-toolbar-title">${state.activeTab === 'builder' ? 'Mein Stil' : state.activeTab === 'outfits' ? 'Outfit-Vorschau' : 'Kleidungs-Vorschau'}</span>
                            <span class="wardrobe-toolbar-hint">${state.activeTab === 'builder' ? 'Eigene Outfits zusammenstellen und speichern' : 'Erst Vorschau, dann Ausrüsten'}</span>
                        </div>
                        ${state.activeTab !== 'builder' ? preview : ''}
                        ${cardsHtml}
                    </main>
                </div>
            </div>
        </div>
    `;

    root.querySelectorAll('[data-action="tab"]').forEach((element) => {
        element.addEventListener('click', () => {
            state.activeTab = element.getAttribute('data-tab') || 'tops';
            clearPreview();
            if (state.activeTab === 'builder') {
                BUILDER_COMPONENTS.forEach((comp) => trigger('cef:myOutfit:initComponent', comp.id));
                trigger('cef:myOutfit:requestList');
            }
            render();
        });
    });

    root.querySelector('[data-action="close"]')?.addEventListener('click', () => {
        trigger('cef:wardrobe:close');
    });

    root.querySelector('[data-action="end-service"]')?.addEventListener('click', () => {
        trigger('cef:wardrobe:endService');
    });

    root.querySelectorAll('[data-action="preview-item"]').forEach((element) => {
        const itemId = Number(element.getAttribute('data-item-id'));
        const item = state.catalog.items.find((entry) => Number(entry.itemId) === itemId);
        if (!item) {
            return;
        }

        element.addEventListener('click', () => previewItem(item));
    });

    root.querySelectorAll('[data-action="apply-item"]').forEach((element) => {
        const itemId = Number(element.getAttribute('data-item-id'));
        const item = state.catalog.items.find((entry) => Number(entry.itemId) === itemId);
        if (!item) {
            return;
        }

        element.addEventListener('click', () => trigger('cef:wardrobe:applyItem', item.itemId));
    });

    root.querySelectorAll('[data-action="preview-outfit"]').forEach((element) => {
        const outfitId = Number(element.getAttribute('data-outfit-id'));
        const outfit = state.catalog.outfits.find((entry) => Number(entry.outfitId) === outfitId);
        if (!outfit) {
            return;
        }

        element.addEventListener('click', () => previewOutfit(outfit));
    });

    root.querySelectorAll('[data-action="apply-outfit"]').forEach((element) => {
        const outfitId = Number(element.getAttribute('data-outfit-id'));
        const outfit = state.catalog.outfits.find((entry) => Number(entry.outfitId) === outfitId);
        if (!outfit) {
            return;
        }

        element.addEventListener('click', () => trigger('cef:wardrobe:applyOutfit', outfit.outfitId));
    });

    // Builder controls
    root.querySelectorAll('[data-action="prev-drawable"]').forEach((element) => {
        const compId = Number(element.getAttribute('data-comp'));
        element.addEventListener('click', () => trigger('cef:myOutfit:cycleDrawable', compId, -1));
    });

    root.querySelectorAll('[data-action="next-drawable"]').forEach((element) => {
        const compId = Number(element.getAttribute('data-comp'));
        element.addEventListener('click', () => trigger('cef:myOutfit:cycleDrawable', compId, 1));
    });

    root.querySelectorAll('[data-action="prev-texture"]').forEach((element) => {
        const compId = Number(element.getAttribute('data-comp'));
        element.addEventListener('click', () => trigger('cef:myOutfit:cycleTexture', compId, -1));
    });

    root.querySelectorAll('[data-action="next-texture"]').forEach((element) => {
        const compId = Number(element.getAttribute('data-comp'));
        element.addEventListener('click', () => trigger('cef:myOutfit:cycleTexture', compId, 1));
    });

    root.querySelector('[data-action="builder-save"]')?.addEventListener('click', () => {
        const input = document.getElementById('builder-name-input');
        const name = (input?.value || '').trim();
        if (!name) return;
        trigger('cef:myOutfit:save', name);
        if (input) input.value = '';
    });

    root.querySelectorAll('[data-action="my-outfit-apply"]').forEach((element) => {
        const outfitId = Number(element.getAttribute('data-outfit-id'));
        element.addEventListener('click', () => trigger('cef:myOutfit:apply', outfitId));
    });

    root.querySelectorAll('[data-action="my-outfit-delete"]').forEach((element) => {
        const outfitId = Number(element.getAttribute('data-outfit-id'));
        element.addEventListener('click', () => trigger('cef:myOutfit:delete', outfitId));
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        trigger('cef:wardrobe:close');
    }
});

window.wardrobeApp = {
    show: () => {
        state.visible = true;
        render();
    },
    hide: () => {
        state.visible = false;
        render();
    },
    setCatalog: (data) => {
        state.catalog = Array.isArray(data)
            ? { items: data.map(normalizeItem), outfits: [] }
            : {
                items: Array.isArray(data?.items) ? data.items.map(normalizeItem) : [],
                outfits: Array.isArray(data?.outfits) ? data.outfits.map(normalizeOutfit) : []
            };
        render();
    },
    updateComponentState: (componentId, drawable, texture) => {
        state.builderComponents[componentId] = {
            drawable: Number(drawable),
            texture: Number(texture)
        };
        if (state.activeTab === 'builder') render();
    },
    setMyOutfits: (outfits) => {
        state.myOutfits = Array.isArray(outfits) ? outfits : [];
        if (state.activeTab === 'builder') render();
    }
};

render();
trigger('cef:wardrobe:ready');
