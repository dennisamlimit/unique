(()=>{function n(r,...a){typeof window>"u"||typeof window.mp>"u"||window.mp.trigger(r,...a)}var w=[{id:"tops",label:"Oberteile"},{id:"legs",label:"Hosen"},{id:"feet",label:"Schuhe"},{id:"armor",label:"Westen"},{id:"outfits",label:"Outfits"}],t={visible:!1,activeTab:"tops",catalog:{items:[],outfits:[]},hoveredItem:null};function u(r,a){if(typeof r=="string"&&r.trim())return r;if(r&&typeof r=="object"){if(typeof r.name=="string"&&r.name.trim())return r.name;if(typeof r.label=="string"&&r.label.trim())return r.label}return a}function g(r){let a=Number(r==null?void 0:r.componentId),i=Number(r==null?void 0:r.drawableId),b=Number(r==null?void 0:r.textureId);return{itemId:Number((r==null?void 0:r.itemId)??0),factionId:Number((r==null?void 0:r.factionId)??0),minRank:Number((r==null?void 0:r.minRank)??1),componentId:a,drawableId:i,textureId:b,category:String((r==null?void 0:r.category)??""),label:u(r==null?void 0:r.label,`Item ${Number.isInteger(i)?i:"?"}`)}}function v(r){return{outfitId:Number((r==null?void 0:r.outfitId)??0),factionId:Number((r==null?void 0:r.factionId)??0),category:String((r==null?void 0:r.category)??"dienst"),name:u(r==null?void 0:r.name,`Outfit ${Number((r==null?void 0:r.outfitId)??0)}`),clothingJson:typeof(r==null?void 0:r.clothingJson)=="string"?r.clothingJson:"[]"}}function x(){let r=document.getElementById("root");if(!r)throw new Error("wardrobe root not found");return r}function y(r){try{let a=JSON.parse(r||"[]");return Array.isArray(a)?a:[]}catch{return[]}}function h(){return Array.isArray(t.catalog.items)?t.catalog.items.filter(r=>r.category===t.activeTab):[]}function I(){return t.activeTab==="outfits"&&Array.isArray(t.catalog.outfits)?t.catalog.outfits:[]}function k(r){let a=Number(r==null?void 0:r.componentId),i=Number(r==null?void 0:r.drawableId),b=Number(r==null?void 0:r.textureId);!Number.isInteger(a)||!Number.isInteger(i)||!Number.isInteger(b)||(t.hoveredItem=r,n("cef:wardrobe:previewItem",JSON.stringify({componentId:a,drawableId:i,textureId:b})),d())}function A(r){t.hoveredItem=r,n("cef:wardrobe:previewOutfit",JSON.stringify({outfitId:r.outfitId,clothing:y(r.clothingJson)})),d()}function N(){t.hoveredItem=null,n("cef:wardrobe:clearPreview"),d()}function d(){var l,p;let r=x();if(!t.visible){r.innerHTML="";return}let a=h(),i=I(),b=t.hoveredItem?`
            <div class="wardrobe-preview-card">
                <strong>${t.hoveredItem.name||t.hoveredItem.label||"Vorschau"}</strong>
                <span>${String(t.hoveredItem.category||t.activeTab).toUpperCase()}</span>
            </div>
        `:"",f=w.map(e=>`
        <button class="nav-item ${t.activeTab===e.id?"active":""}" data-action="tab" data-tab="${e.id}" type="button">
            <span class="label">${e.label}</span>
        </button>
    `).join(""),m=t.activeTab!=="outfits"?a.map(e=>`
            <div class="item-card">
                <div class="item-rank">Rang ${e.minRank}</div>
                <div class="item-info">
                    <h3>${e.label}</h3>
                    <p>${String(e.category).toUpperCase()}</p>
                </div>
                <div class="item-actions">
                    <button class="item-action secondary" data-action="preview-item" data-item-id="${e.itemId}" type="button">Vorschau</button>
                    <button class="item-action primary" data-action="apply-item" data-item-id="${e.itemId}" type="button">Ausr\xFCsten</button>
                </div>
            </div>
        `).join(""):i.map(e=>`
            <div class="item-card outfit-card">
                <div class="item-info">
                    <h3>${e.name}</h3>
                    <p>${String(e.category).toUpperCase()}</p>
                </div>
                <div class="item-actions">
                    <button class="item-action secondary" data-action="preview-outfit" data-outfit-id="${e.outfitId}" type="button">Vorschau</button>
                    <button class="item-action primary" data-action="apply-outfit" data-outfit-id="${e.outfitId}" type="button">Ausr\xFCsten</button>
                </div>
            </div>
        `).join("");r.innerHTML=`
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
                        ${f}
                        <div class="sidebar-footer">
                            <button class="end-service-btn" data-action="end-service" type="button">
                                <span>Dienst beenden</span>
                            </button>
                        </div>
                    </nav>
                    <main class="wardrobe-main">
                        <div class="wardrobe-toolbar">
                            <span class="wardrobe-toolbar-title">${t.activeTab==="outfits"?"Outfit-Vorschau":"Kleidungs-Vorschau"}</span>
                            <span class="wardrobe-toolbar-hint">Erst Vorschau, dann Ausr\xFCsten</span>
                        </div>
                        ${b}
                        <div class="item-grid">${m}</div>
                    </main>
                </div>
            </div>
        </div>
    `,r.querySelectorAll('[data-action="tab"]').forEach(e=>{e.addEventListener("click",()=>{t.activeTab=e.getAttribute("data-tab")||"tops",N(),d()})}),(l=r.querySelector('[data-action="close"]'))==null||l.addEventListener("click",()=>{n("cef:wardrobe:close")}),(p=r.querySelector('[data-action="end-service"]'))==null||p.addEventListener("click",()=>{n("cef:wardrobe:endService")}),r.querySelectorAll('[data-action="preview-item"]').forEach(e=>{let s=Number(e.getAttribute("data-item-id")),o=t.catalog.items.find(c=>Number(c.itemId)===s);o&&e.addEventListener("click",()=>k(o))}),r.querySelectorAll('[data-action="apply-item"]').forEach(e=>{let s=Number(e.getAttribute("data-item-id")),o=t.catalog.items.find(c=>Number(c.itemId)===s);o&&e.addEventListener("click",()=>n("cef:wardrobe:applyItem",o.itemId))}),r.querySelectorAll('[data-action="preview-outfit"]').forEach(e=>{let s=Number(e.getAttribute("data-outfit-id")),o=t.catalog.outfits.find(c=>Number(c.outfitId)===s);o&&e.addEventListener("click",()=>A(o))}),r.querySelectorAll('[data-action="apply-outfit"]').forEach(e=>{let s=Number(e.getAttribute("data-outfit-id")),o=t.catalog.outfits.find(c=>Number(c.outfitId)===s);o&&e.addEventListener("click",()=>n("cef:wardrobe:applyOutfit",o.outfitId))})}window.addEventListener("keydown",r=>{r.key==="Escape"&&n("cef:wardrobe:close")});window.wardrobeApp={show:()=>{t.visible=!0,d()},hide:()=>{t.visible=!1,d()},setCatalog:r=>{t.catalog=Array.isArray(r)?{items:r.map(g),outfits:[]}:{items:Array.isArray(r==null?void 0:r.items)?r.items.map(g):[],outfits:Array.isArray(r==null?void 0:r.outfits)?r.outfits.map(v):[]},d()}};d();n("cef:wardrobe:ready");})();
