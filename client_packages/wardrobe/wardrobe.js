(()=>{function o(e,...n){typeof window>"u"||typeof window.mp>"u"||window.mp.trigger(e,...n)}var y=[{id:"tops",label:"Oberteile"},{id:"legs",label:"Hosen"},{id:"feet",label:"Schuhe"},{id:"armor",label:"Westen"},{id:"outfits",label:"Outfits"},{id:"builder",label:"Mein Stil"}],g=[{id:11,label:"Oberteil"},{id:8,label:"Shirt"},{id:4,label:"Hose"},{id:6,label:"Schuhe"},{id:9,label:"Weste"}],r={visible:!1,activeTab:"tops",catalog:{items:[],outfits:[]},hoveredItem:null,builderComponents:{},myOutfits:[]};function x(e,n){if(typeof e=="string"&&e.trim())return e;if(e&&typeof e=="object"){if(typeof e.name=="string"&&e.name.trim())return e.name;if(typeof e.label=="string"&&e.label.trim())return e.label}return n}function m(e){let n=Number(e==null?void 0:e.componentId),d=Number(e==null?void 0:e.drawableId),l=Number(e==null?void 0:e.textureId);return{itemId:Number((e==null?void 0:e.itemId)??0),factionId:Number((e==null?void 0:e.factionId)??0),minRank:Number((e==null?void 0:e.minRank)??1),componentId:n,drawableId:d,textureId:l,category:String((e==null?void 0:e.category)??""),label:x(e==null?void 0:e.label,`Item ${Number.isInteger(d)?d:"?"}`)}}function w(e){return{outfitId:Number((e==null?void 0:e.outfitId)??0),factionId:Number((e==null?void 0:e.factionId)??0),category:String((e==null?void 0:e.category)??"dienst"),name:x(e==null?void 0:e.name,`Outfit ${Number((e==null?void 0:e.outfitId)??0)}`),clothingJson:typeof(e==null?void 0:e.clothingJson)=="string"?e.clothingJson:"[]"}}function h(){let e=document.getElementById("root");if(!e)throw new Error("wardrobe root not found");return e}function I(e){try{let n=JSON.parse(e||"[]");return Array.isArray(n)?n:[]}catch{return[]}}function k(){return Array.isArray(r.catalog.items)?r.catalog.items.filter(e=>e.category===r.activeTab):[]}function A(){return r.activeTab==="outfits"&&Array.isArray(r.catalog.outfits)?r.catalog.outfits:[]}function N(e){let n=Number(e==null?void 0:e.componentId),d=Number(e==null?void 0:e.drawableId),l=Number(e==null?void 0:e.textureId);!Number.isInteger(n)||!Number.isInteger(d)||!Number.isInteger(l)||(r.hoveredItem=e,o("cef:wardrobe:previewItem",JSON.stringify({componentId:n,drawableId:d,textureId:l})),c())}function E(e){r.hoveredItem=e,o("cef:wardrobe:previewOutfit",JSON.stringify({outfitId:e.outfitId,clothing:I(e.clothingJson)})),c()}function O(){r.hoveredItem=null,o("cef:wardrobe:clearPreview"),c()}function c(){var p,u,f;let e=h();if(!r.visible){e.innerHTML="";return}let n=k(),d=A(),l=r.hoveredItem?`
            <div class="wardrobe-preview-card">
                <strong>${r.hoveredItem.name||r.hoveredItem.label||"Vorschau"}</strong>
                <span>${String(r.hoveredItem.category||r.activeTab).toUpperCase()}</span>
            </div>
        `:"",v=y.map(t=>`
        <button class="nav-item ${r.activeTab===t.id?"active":""}" data-action="tab" data-tab="${t.id}" type="button">
            <span class="label">${t.label}</span>
        </button>
    `).join(""),b="";if(r.activeTab==="builder"){let t=g.map(i=>{let s=r.builderComponents[i.id]||{drawable:0,texture:0};return`
                <div class="builder-row">
                    <span class="builder-comp-label">${i.label}</span>
                    <div class="builder-controls">
                        <button class="builder-btn" data-action="prev-drawable" data-comp="${i.id}" type="button">&#9664;</button>
                        <span class="builder-value">${s.drawable}</span>
                        <button class="builder-btn" data-action="next-drawable" data-comp="${i.id}" type="button">&#9654;</button>
                        <span class="builder-sep">Tex</span>
                        <button class="builder-btn" data-action="prev-texture" data-comp="${i.id}" type="button">&#9664;</button>
                        <span class="builder-value">${s.texture}</span>
                        <button class="builder-btn" data-action="next-texture" data-comp="${i.id}" type="button">&#9654;</button>
                    </div>
                </div>
            `}).join(""),a=r.myOutfits.length===0?'<p class="builder-empty">Noch keine gespeicherten Outfits.</p>':r.myOutfits.map(i=>`
                <div class="builder-saved-row">
                    <span class="builder-saved-name">${i.name}</span>
                    <div class="builder-saved-actions">
                        <button class="item-action primary" data-action="my-outfit-apply" data-outfit-id="${i.outfitId}" type="button">Anlegen</button>
                        <button class="item-action builder-delete" data-action="my-outfit-delete" data-outfit-id="${i.outfitId}" type="button">&#10005;</button>
                    </div>
                </div>
            `).join("");b=`
            <div class="builder-panel">
                <div class="builder-section-title">Kleidung anpassen</div>
                ${t}
                <div class="builder-save-row">
                    <input class="builder-name-input" id="builder-name-input" type="text" placeholder="Outfit-Name..." maxlength="32" />
                    <button class="item-action primary" data-action="builder-save" type="button">Speichern</button>
                </div>
                <div class="builder-section-title" style="margin-top:24px;">Gespeicherte Outfits</div>
                ${a}
            </div>
        `}else r.activeTab==="outfits"?b=`<div class="item-grid">${d.map(t=>`
            <div class="item-card outfit-card">
                <div class="item-info">
                    <h3>${t.name}</h3>
                    <p>${String(t.category).toUpperCase()}</p>
                </div>
                <div class="item-actions">
                    <button class="item-action secondary" data-action="preview-outfit" data-outfit-id="${t.outfitId}" type="button">Vorschau</button>
                    <button class="item-action primary" data-action="apply-outfit" data-outfit-id="${t.outfitId}" type="button">Ausr\xFCsten</button>
                </div>
            </div>
        `).join("")}</div>`:b=`<div class="item-grid">${n.map(t=>`
            <div class="item-card">
                <div class="item-rank">Rang ${t.minRank}</div>
                <div class="item-info">
                    <h3>${t.label}</h3>
                    <p>${String(t.category).toUpperCase()}</p>
                </div>
                <div class="item-actions">
                    <button class="item-action secondary" data-action="preview-item" data-item-id="${t.itemId}" type="button">Vorschau</button>
                    <button class="item-action primary" data-action="apply-item" data-item-id="${t.itemId}" type="button">Ausr\xFCsten</button>
                </div>
            </div>
        `).join("")}</div>`;e.innerHTML=`
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
                        ${v}
                        <div class="sidebar-footer">
                            <button class="end-service-btn" data-action="end-service" type="button">
                                <span>Dienst beenden</span>
                            </button>
                        </div>
                    </nav>
                    <main class="wardrobe-main">
                        <div class="wardrobe-toolbar">
                            <span class="wardrobe-toolbar-title">${r.activeTab==="builder"?"Mein Stil":r.activeTab==="outfits"?"Outfit-Vorschau":"Kleidungs-Vorschau"}</span>
                            <span class="wardrobe-toolbar-hint">${r.activeTab==="builder"?"Eigene Outfits zusammenstellen und speichern":"Erst Vorschau, dann Ausr\xFCsten"}</span>
                        </div>
                        ${r.activeTab!=="builder"?l:""}
                        ${b}
                    </main>
                </div>
            </div>
        </div>
    `,e.querySelectorAll('[data-action="tab"]').forEach(t=>{t.addEventListener("click",()=>{r.activeTab=t.getAttribute("data-tab")||"tops",O(),r.activeTab==="builder"&&(g.forEach(a=>o("cef:myOutfit:initComponent",a.id)),o("cef:myOutfit:requestList")),c()})}),(p=e.querySelector('[data-action="close"]'))==null||p.addEventListener("click",()=>{o("cef:wardrobe:close")}),(u=e.querySelector('[data-action="end-service"]'))==null||u.addEventListener("click",()=>{o("cef:wardrobe:endService")}),e.querySelectorAll('[data-action="preview-item"]').forEach(t=>{let a=Number(t.getAttribute("data-item-id")),i=r.catalog.items.find(s=>Number(s.itemId)===a);i&&t.addEventListener("click",()=>N(i))}),e.querySelectorAll('[data-action="apply-item"]').forEach(t=>{let a=Number(t.getAttribute("data-item-id")),i=r.catalog.items.find(s=>Number(s.itemId)===a);i&&t.addEventListener("click",()=>o("cef:wardrobe:applyItem",i.itemId))}),e.querySelectorAll('[data-action="preview-outfit"]').forEach(t=>{let a=Number(t.getAttribute("data-outfit-id")),i=r.catalog.outfits.find(s=>Number(s.outfitId)===a);i&&t.addEventListener("click",()=>E(i))}),e.querySelectorAll('[data-action="apply-outfit"]').forEach(t=>{let a=Number(t.getAttribute("data-outfit-id")),i=r.catalog.outfits.find(s=>Number(s.outfitId)===a);i&&t.addEventListener("click",()=>o("cef:wardrobe:applyOutfit",i.outfitId))}),e.querySelectorAll('[data-action="prev-drawable"]').forEach(t=>{let a=Number(t.getAttribute("data-comp"));t.addEventListener("click",()=>o("cef:myOutfit:cycleDrawable",a,-1))}),e.querySelectorAll('[data-action="next-drawable"]').forEach(t=>{let a=Number(t.getAttribute("data-comp"));t.addEventListener("click",()=>o("cef:myOutfit:cycleDrawable",a,1))}),e.querySelectorAll('[data-action="prev-texture"]').forEach(t=>{let a=Number(t.getAttribute("data-comp"));t.addEventListener("click",()=>o("cef:myOutfit:cycleTexture",a,-1))}),e.querySelectorAll('[data-action="next-texture"]').forEach(t=>{let a=Number(t.getAttribute("data-comp"));t.addEventListener("click",()=>o("cef:myOutfit:cycleTexture",a,1))}),(f=e.querySelector('[data-action="builder-save"]'))==null||f.addEventListener("click",()=>{let t=document.getElementById("builder-name-input"),a=((t==null?void 0:t.value)||"").trim();a&&(o("cef:myOutfit:save",a),t&&(t.value=""))}),e.querySelectorAll('[data-action="my-outfit-apply"]').forEach(t=>{let a=Number(t.getAttribute("data-outfit-id"));t.addEventListener("click",()=>o("cef:myOutfit:apply",a))}),e.querySelectorAll('[data-action="my-outfit-delete"]').forEach(t=>{let a=Number(t.getAttribute("data-outfit-id"));t.addEventListener("click",()=>o("cef:myOutfit:delete",a))})}window.addEventListener("keydown",e=>{e.key==="Escape"&&o("cef:wardrobe:close")});window.wardrobeApp={show:()=>{r.visible=!0,c()},hide:()=>{r.visible=!1,c()},setCatalog:e=>{r.catalog=Array.isArray(e)?{items:e.map(m),outfits:[]}:{items:Array.isArray(e==null?void 0:e.items)?e.items.map(m):[],outfits:Array.isArray(e==null?void 0:e.outfits)?e.outfits.map(w):[]},c()},updateComponentState:(e,n,d)=>{r.builderComponents[e]={drawable:Number(n),texture:Number(d)},r.activeTab==="builder"&&c()},setMyOutfits:e=>{r.myOutfits=Array.isArray(e)?e:[],r.activeTab==="builder"&&c()}};c();o("cef:wardrobe:ready");})();
