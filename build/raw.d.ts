/**
 *
 */
interface RawElements {
    a(...params: Raw.Param<Raw.AnchorElementAttribute>[]): HTMLAnchorElement;
    abbr(...params: Raw.Param[]): HTMLElement;
    address(...params: Raw.Param[]): HTMLElement;
    area(...params: Raw.Param[]): HTMLAreaElement;
    article(...params: Raw.Param[]): HTMLElement;
    aside(...params: Raw.Param[]): HTMLElement;
    audio(...params: Raw.Param[]): HTMLAudioElement;
    b(...params: Raw.Param[]): HTMLElement;
    base(...params: Raw.Param<Raw.BaseElementAttribute>[]): HTMLBaseElement;
    bdi(...params: Raw.Param[]): HTMLElement;
    bdo(...params: Raw.Param[]): HTMLElement;
    blockquote(...params: Raw.Param[]): HTMLQuoteElement;
    body(...params: Raw.Param[]): HTMLBodyElement;
    br(...params: Raw.Param[]): HTMLBRElement;
    button(...params: Raw.Param[]): HTMLButtonElement;
    canvas(...params: Raw.Param[]): HTMLCanvasElement;
    caption(...params: Raw.Param[]): HTMLTableCaptionElement;
    cite(...params: Raw.Param[]): HTMLElement;
    code(...params: Raw.Param[]): HTMLElement;
    col(...params: Raw.Param[]): HTMLTableColElement;
    colgroup(...params: Raw.Param[]): HTMLTableColElement;
    data(...params: Raw.Param[]): HTMLDataElement;
    datalist(...params: Raw.Param[]): HTMLDataListElement;
    dd(...params: Raw.Param[]): HTMLElement;
    del(...params: Raw.Param[]): HTMLModElement;
    details(...params: Raw.Param[]): HTMLDetailsElement;
    dfn(...params: Raw.Param[]): HTMLElement;
    dialog(...params: Raw.Param[]): HTMLDialogElement;
    dir(...params: Raw.Param[]): HTMLDirectoryElement;
    div(...params: Raw.Param[]): HTMLDivElement;
    dl(...params: Raw.Param[]): HTMLDListElement;
    dt(...params: Raw.Param[]): HTMLElement;
    em(...params: Raw.Param[]): HTMLElement;
    embed(...params: Raw.Param[]): HTMLEmbedElement;
    fieldset(...params: Raw.Param[]): HTMLFieldSetElement;
    figcaption(...params: Raw.Param[]): HTMLElement;
    figure(...params: Raw.Param[]): HTMLElement;
    font(...params: Raw.Param[]): HTMLFontElement;
    footer(...params: Raw.Param[]): HTMLElement;
    form(...params: Raw.Param<Raw.FormElementAttribute>[]): HTMLFormElement;
    frame(...params: Raw.Param[]): HTMLFrameElement;
    frameset(...params: Raw.Param[]): HTMLFrameSetElement;
    h1(...params: Raw.Param[]): HTMLHeadingElement;
    h2(...params: Raw.Param[]): HTMLHeadingElement;
    h3(...params: Raw.Param[]): HTMLHeadingElement;
    h4(...params: Raw.Param[]): HTMLHeadingElement;
    h5(...params: Raw.Param[]): HTMLHeadingElement;
    h6(...params: Raw.Param[]): HTMLHeadingElement;
    head(...params: Raw.Param[]): HTMLHeadElement;
    header(...params: Raw.Param[]): HTMLElement;
    hgroup(...params: Raw.Param[]): HTMLElement;
    hr(...params: Raw.Param[]): HTMLHRElement;
    i(...params: Raw.Param[]): HTMLElement;
    iframe(...params: Raw.Param<Raw.FrameElementAttribute>[]): HTMLIFrameElement;
    img(...params: Raw.Param<Raw.ImageElementAttribute>[]): HTMLImageElement;
    input(...params: Raw.Param<Raw.InputElementAttribute>[]): HTMLInputElement;
    ins(...params: Raw.Param[]): HTMLModElement;
    kbd(...params: Raw.Param[]): HTMLElement;
    label(...params: Raw.Param[]): HTMLLabelElement;
    legend(...params: Raw.Param[]): HTMLLegendElement;
    li(...params: Raw.Param[]): HTMLLIElement;
    link(...params: Raw.Param<Raw.LinkElementAttribute>[]): HTMLLinkElement;
    main(...params: Raw.Param[]): HTMLElement;
    map(...params: Raw.Param[]): HTMLMapElement;
    mark(...params: Raw.Param[]): HTMLElement;
    marquee(...params: Raw.Param[]): HTMLMarqueeElement;
    menu(...params: Raw.Param[]): HTMLMenuElement;
    meta(...params: Raw.Param<Raw.MetaElementAttribute>[]): HTMLMetaElement;
    meter(...params: Raw.Param[]): HTMLMeterElement;
    nav(...params: Raw.Param[]): HTMLElement;
    noscript(...params: Raw.Param[]): HTMLElement;
    object(...params: Raw.Param[]): HTMLObjectElement;
    ol(...params: Raw.Param[]): HTMLOListElement;
    optgroup(...params: Raw.Param[]): HTMLOptGroupElement;
    option(...params: Raw.Param[]): HTMLOptionElement;
    output(...params: Raw.Param[]): HTMLOutputElement;
    p(...params: Raw.Param[]): HTMLParagraphElement;
    param(...params: Raw.Param[]): HTMLParamElement;
    picture(...params: Raw.Param[]): HTMLPictureElement;
    pre(...params: Raw.Param[]): HTMLPreElement;
    progress(...params: Raw.Param[]): HTMLProgressElement;
    q(...params: Raw.Param[]): HTMLQuoteElement;
    rp(...params: Raw.Param[]): HTMLElement;
    rt(...params: Raw.Param[]): HTMLElement;
    ruby(...params: Raw.Param[]): HTMLElement;
    s(...params: Raw.Param[]): HTMLElement;
    samp(...params: Raw.Param[]): HTMLElement;
    script(...params: Raw.Param<Raw.ScriptElementAttribute>[]): HTMLScriptElement;
    section(...params: Raw.Param[]): HTMLElement;
    select(...params: Raw.Param[]): HTMLSelectElement;
    slot(...params: Raw.Param[]): HTMLSlotElement;
    small(...params: Raw.Param[]): HTMLElement;
    source(...params: Raw.Param[]): HTMLSourceElement;
    span(...params: Raw.Param[]): HTMLSpanElement;
    strong(...params: Raw.Param[]): HTMLElement;
    sub(...params: Raw.Param[]): HTMLElement;
    summary(...params: Raw.Param[]): HTMLElement;
    sup(...params: Raw.Param[]): HTMLElement;
    table(...params: Raw.Param[]): HTMLTableElement;
    tbody(...params: Raw.Param[]): HTMLTableSectionElement;
    td(...params: Raw.Param[]): HTMLTableCellElement;
    template(...params: Raw.Param[]): HTMLTemplateElement;
    textarea(...params: Raw.Param[]): HTMLTextAreaElement;
    tfoot(...params: Raw.Param[]): HTMLTableSectionElement;
    th(...params: Raw.Param[]): HTMLTableCellElement;
    thead(...params: Raw.Param[]): HTMLTableSectionElement;
    time(...params: Raw.Param[]): HTMLTimeElement;
    title(...params: Raw.Param[]): HTMLTitleElement;
    tr(...params: Raw.Param[]): HTMLTableRowElement;
    track(...params: Raw.Param[]): HTMLTrackElement;
    u(...params: Raw.Param[]): HTMLElement;
    ul(...params: Raw.Param[]): HTMLUListElement;
    video(...params: Raw.Param<Raw.VideoElementAttribute>[]): HTMLVideoElement;
    wbr(...params: Raw.Param[]): HTMLElement;
    new (): RawElements;
}
/**
 * JSX compatibility
 */
declare namespace JSX {
    type Element = globalThis.Element;
    type E<T = Raw.ElementAttribute> = Partial<T | Raw.Style>;
    interface IntrinsicElements {
        a: E<Raw.AnchorElementAttribute>;
        abbr: E;
        address: E;
        area: E;
        article: E;
        aside: E;
        audio: E;
        b: E;
        base: E<Raw.BaseElementAttribute>;
        bdi: E;
        bdo: E;
        blockquote: E;
        body: E;
        br: E;
        button: E;
        canvas: E;
        caption: E;
        cite: E;
        code: E;
        col: E;
        colgroup: E;
        data: E;
        datalist: E;
        dd: E;
        del: E;
        details: E;
        dfn: E;
        dialog: E;
        dir: E;
        div: E;
        dl: E;
        dt: E;
        em: E;
        embed: E;
        fieldset: E;
        figcaption: E;
        figure: E;
        font: E;
        footer: E;
        form: E<Raw.FormElementAttribute>;
        frame: E;
        frameset: E;
        h1: E;
        h2: E;
        h3: E;
        h4: E;
        h5: E;
        h6: E;
        head: E;
        header: E;
        hgroup: E;
        hr: E;
        i: E;
        iframe: E<Raw.FrameElementAttribute>;
        img: E<Raw.ImageElementAttribute>;
        input: E<Raw.InputElementAttribute>;
        ins: E;
        kbd: E;
        label: E;
        legend: E;
        li: E;
        link: E<Raw.LinkElementAttribute>;
        main: E;
        map: E;
        mark: E;
        marquee: E;
        menu: E;
        meta: E<Raw.MetaElementAttribute>;
        meter: E;
        nav: E;
        noscript: E;
        object: E;
        ol: E;
        optgroup: E;
        option: E;
        output: E;
        p: E;
        param: E;
        picture: E;
        pre: E;
        progress: E;
        q: E;
        rp: E;
        rt: E;
        ruby: E;
        s: E;
        samp: E;
        script: E<Raw.ScriptElementAttribute>;
        section: E;
        select: E;
        slot: E;
        small: E;
        source: E;
        span: E;
        strong: E;
        sub: E;
        summary: E;
        sup: E;
        table: E;
        tbody: E;
        td: E;
        template: E;
        textarea: E;
        tfoot: E;
        th: E;
        thead: E;
        time: E;
        title: E;
        tr: E;
        track: E;
        u: E;
        ul: E;
        video: E<Raw.VideoElementAttribute>;
        wbr: E;
    }
}
declare const Raw_base: RawElements;
declare class Raw extends Raw_base {
    private readonly doc;
    /**
     * Stores the immutable set of HTML elements that
     * are recognized as HTML element creation functions.
     */
    static readonly elements: ReadonlySet<string>;
    /**
     * Stores the list of strings that are recognized as CSS properties by RawJS,
     * (as opposed to being recognized as HTML attributes). Users may contribute
     * strings to this set in order to add support for custom CSS properties.
     */
    static readonly properties: Set<string>;
    /** */
    static readonly HTMLCustomElement: {
        new (): {
            accessKey: string;
            readonly accessKeyLabel: string;
            autocapitalize: string;
            dir: string;
            draggable: boolean;
            hidden: boolean;
            inert: boolean;
            innerText: string;
            lang: string;
            readonly offsetHeight: number;
            readonly offsetLeft: number;
            readonly offsetParent: Element | null;
            readonly offsetTop: number;
            readonly offsetWidth: number;
            outerText: string;
            spellcheck: boolean;
            title: string;
            translate: boolean;
            attachInternals(): ElementInternals;
            click(): void;
            addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions | undefined): void;
            addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | undefined): void;
            removeEventListener<K_1 extends keyof HTMLElementEventMap>(type: K_1, listener: (this: HTMLElement, ev: HTMLElementEventMap[K_1]) => any, options?: boolean | EventListenerOptions | undefined): void;
            removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions | undefined): void;
            readonly attributes: NamedNodeMap;
            readonly classList: DOMTokenList;
            className: string;
            readonly clientHeight: number;
            readonly clientLeft: number;
            readonly clientTop: number;
            readonly clientWidth: number;
            id: string;
            readonly localName: string;
            readonly namespaceURI: string | null;
            onfullscreenchange: ((this: Element, ev: Event) => any) | null;
            onfullscreenerror: ((this: Element, ev: Event) => any) | null;
            outerHTML: string;
            readonly ownerDocument: Document;
            readonly part: DOMTokenList;
            readonly prefix: string | null;
            readonly scrollHeight: number;
            scrollLeft: number;
            scrollTop: number;
            readonly scrollWidth: number;
            readonly shadowRoot: ShadowRoot | null;
            slot: string;
            readonly tagName: string;
            attachShadow(init: ShadowRootInit): ShadowRoot;
            checkVisibility(options?: CheckVisibilityOptions | undefined): boolean;
            closest<K_2 extends keyof HTMLElementTagNameMap>(selector: K_2): HTMLElementTagNameMap[K_2] | null;
            closest<K_3 extends keyof SVGElementTagNameMap>(selector: K_3): SVGElementTagNameMap[K_3] | null;
            closest<K_4 extends keyof MathMLElementTagNameMap>(selector: K_4): MathMLElementTagNameMap[K_4] | null;
            closest<E extends Element = Element>(selectors: string): E | null;
            computedStyleMap(): StylePropertyMapReadOnly;
            getAttribute(qualifiedName: string): string | null;
            getAttributeNS(namespace: string | null, localName: string): string | null;
            getAttributeNames(): string[];
            getAttributeNode(qualifiedName: string): Attr | null;
            getAttributeNodeNS(namespace: string | null, localName: string): Attr | null;
            getBoundingClientRect(): DOMRect;
            getClientRects(): DOMRectList;
            getElementsByClassName(classNames: string): HTMLCollectionOf<Element>;
            getElementsByTagName<K_5 extends keyof HTMLElementTagNameMap>(qualifiedName: K_5): HTMLCollectionOf<HTMLElementTagNameMap[K_5]>;
            getElementsByTagName<K_6 extends keyof SVGElementTagNameMap>(qualifiedName: K_6): HTMLCollectionOf<SVGElementTagNameMap[K_6]>;
            getElementsByTagName<K_7 extends keyof MathMLElementTagNameMap>(qualifiedName: K_7): HTMLCollectionOf<MathMLElementTagNameMap[K_7]>;
            getElementsByTagName<K_8 extends keyof HTMLElementDeprecatedTagNameMap>(qualifiedName: K_8): HTMLCollectionOf<HTMLElementDeprecatedTagNameMap[K_8]>;
            getElementsByTagName(qualifiedName: string): HTMLCollectionOf<Element>;
            getElementsByTagNameNS(namespaceURI: "http://www.w3.org/1999/xhtml", localName: string): HTMLCollectionOf<HTMLElement>;
            getElementsByTagNameNS(namespaceURI: "http://www.w3.org/2000/svg", localName: string): HTMLCollectionOf<SVGElement>;
            getElementsByTagNameNS(namespaceURI: "http://www.w3.org/1998/Math/MathML", localName: string): HTMLCollectionOf<MathMLElement>;
            getElementsByTagNameNS(namespace: string | null, localName: string): HTMLCollectionOf<Element>;
            hasAttribute(qualifiedName: string): boolean;
            hasAttributeNS(namespace: string | null, localName: string): boolean;
            hasAttributes(): boolean;
            hasPointerCapture(pointerId: number): boolean;
            insertAdjacentElement(where: InsertPosition, element: Element): Element | null;
            insertAdjacentHTML(position: InsertPosition, text: string): void;
            insertAdjacentText(where: InsertPosition, data: string): void;
            matches(selectors: string): boolean;
            releasePointerCapture(pointerId: number): void;
            removeAttribute(qualifiedName: string): void;
            removeAttributeNS(namespace: string | null, localName: string): void;
            removeAttributeNode(attr: Attr): Attr;
            requestFullscreen(options?: FullscreenOptions | undefined): Promise<void>;
            requestPointerLock(): void;
            scroll(options?: ScrollToOptions | undefined): void;
            scroll(x: number, y: number): void;
            scrollBy(options?: ScrollToOptions | undefined): void;
            scrollBy(x: number, y: number): void;
            scrollIntoView(arg?: boolean | ScrollIntoViewOptions | undefined): void;
            scrollTo(options?: ScrollToOptions | undefined): void;
            scrollTo(x: number, y: number): void;
            setAttribute(qualifiedName: string, value: string): void;
            setAttributeNS(namespace: string | null, qualifiedName: string, value: string): void;
            setAttributeNode(attr: Attr): Attr | null;
            setAttributeNodeNS(attr: Attr): Attr | null;
            setPointerCapture(pointerId: number): void;
            toggleAttribute(qualifiedName: string, force?: boolean | undefined): boolean;
            webkitMatchesSelector(selectors: string): boolean;
            readonly baseURI: string;
            readonly childNodes: NodeListOf<ChildNode>;
            readonly firstChild: ChildNode | null;
            readonly isConnected: boolean;
            readonly lastChild: ChildNode | null;
            readonly nextSibling: ChildNode | null;
            readonly nodeName: string;
            readonly nodeType: number;
            nodeValue: string | null;
            readonly parentElement: HTMLElement | null;
            readonly parentNode: ParentNode | null;
            readonly previousSibling: ChildNode | null;
            textContent: string | null;
            appendChild<T extends Node>(node: T): T;
            cloneNode(deep?: boolean | undefined): Node;
            compareDocumentPosition(other: Node): number;
            contains(other: Node | null): boolean;
            getRootNode(options?: GetRootNodeOptions | undefined): Node;
            hasChildNodes(): boolean;
            insertBefore<T_1 extends Node>(node: T_1, child: Node | null): T_1;
            isDefaultNamespace(namespace: string | null): boolean;
            isEqualNode(otherNode: Node | null): boolean;
            isSameNode(otherNode: Node | null): boolean;
            lookupNamespaceURI(prefix: string | null): string | null;
            lookupPrefix(namespace: string | null): string | null;
            normalize(): void;
            removeChild<T_2 extends Node>(child: T_2): T_2;
            replaceChild<T_3 extends Node>(node: Node, child: T_3): T_3;
            readonly ELEMENT_NODE: 1;
            readonly ATTRIBUTE_NODE: 2;
            readonly TEXT_NODE: 3;
            readonly CDATA_SECTION_NODE: 4;
            readonly ENTITY_REFERENCE_NODE: 5;
            readonly ENTITY_NODE: 6;
            readonly PROCESSING_INSTRUCTION_NODE: 7;
            readonly COMMENT_NODE: 8;
            readonly DOCUMENT_NODE: 9;
            readonly DOCUMENT_TYPE_NODE: 10;
            readonly DOCUMENT_FRAGMENT_NODE: 11;
            readonly NOTATION_NODE: 12;
            readonly DOCUMENT_POSITION_DISCONNECTED: 1;
            readonly DOCUMENT_POSITION_PRECEDING: 2;
            readonly DOCUMENT_POSITION_FOLLOWING: 4;
            readonly DOCUMENT_POSITION_CONTAINS: 8;
            readonly DOCUMENT_POSITION_CONTAINED_BY: 16;
            readonly DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: 32;
            dispatchEvent(event: Event): boolean;
            ariaAtomic: string | null;
            ariaAutoComplete: string | null;
            ariaBusy: string | null;
            ariaChecked: string | null;
            ariaColCount: string | null;
            ariaColIndex: string | null;
            ariaColSpan: string | null;
            ariaCurrent: string | null;
            ariaDisabled: string | null;
            ariaExpanded: string | null;
            ariaHasPopup: string | null;
            ariaHidden: string | null;
            ariaInvalid: string | null;
            ariaKeyShortcuts: string | null;
            ariaLabel: string | null;
            ariaLevel: string | null;
            ariaLive: string | null;
            ariaModal: string | null;
            ariaMultiLine: string | null;
            ariaMultiSelectable: string | null;
            ariaOrientation: string | null;
            ariaPlaceholder: string | null;
            ariaPosInSet: string | null;
            ariaPressed: string | null;
            ariaReadOnly: string | null;
            ariaRequired: string | null;
            ariaRoleDescription: string | null;
            ariaRowCount: string | null;
            ariaRowIndex: string | null;
            ariaRowSpan: string | null;
            ariaSelected: string | null;
            ariaSetSize: string | null;
            ariaSort: string | null;
            ariaValueMax: string | null;
            ariaValueMin: string | null;
            ariaValueNow: string | null;
            ariaValueText: string | null;
            role: string | null;
            animate(keyframes: PropertyIndexedKeyframes | Keyframe[] | null, options?: number | KeyframeAnimationOptions | undefined): Animation;
            getAnimations(options?: GetAnimationsOptions | undefined): Animation[];
            after(...nodes: (string | Node)[]): void;
            before(...nodes: (string | Node)[]): void;
            remove(): void;
            replaceWith(...nodes: (string | Node)[]): void;
            innerHTML: string;
            readonly nextElementSibling: Element | null;
            readonly previousElementSibling: Element | null;
            readonly childElementCount: number;
            readonly children: HTMLCollection;
            readonly firstElementChild: Element | null;
            readonly lastElementChild: Element | null;
            append(...nodes: (string | Node)[]): void;
            prepend(...nodes: (string | Node)[]): void;
            querySelector<K_9 extends keyof HTMLElementTagNameMap>(selectors: K_9): HTMLElementTagNameMap[K_9] | null;
            querySelector<K_10 extends keyof SVGElementTagNameMap>(selectors: K_10): SVGElementTagNameMap[K_10] | null;
            querySelector<K_11 extends keyof MathMLElementTagNameMap>(selectors: K_11): MathMLElementTagNameMap[K_11] | null;
            querySelector<K_12 extends keyof HTMLElementDeprecatedTagNameMap>(selectors: K_12): HTMLElementDeprecatedTagNameMap[K_12] | null;
            querySelector<E_1 extends Element = Element>(selectors: string): E_1 | null;
            querySelectorAll<K_13 extends keyof HTMLElementTagNameMap>(selectors: K_13): NodeListOf<HTMLElementTagNameMap[K_13]>;
            querySelectorAll<K_14 extends keyof SVGElementTagNameMap>(selectors: K_14): NodeListOf<SVGElementTagNameMap[K_14]>;
            querySelectorAll<K_15 extends keyof MathMLElementTagNameMap>(selectors: K_15): NodeListOf<MathMLElementTagNameMap[K_15]>;
            querySelectorAll<K_16 extends keyof HTMLElementDeprecatedTagNameMap>(selectors: K_16): NodeListOf<HTMLElementDeprecatedTagNameMap[K_16]>;
            querySelectorAll<E_2 extends Element = Element>(selectors: string): NodeListOf<E_2>;
            replaceChildren(...nodes: (string | Node)[]): void;
            readonly assignedSlot: HTMLSlotElement | null;
            readonly attributeStyleMap: StylePropertyMap;
            readonly style: CSSStyleDeclaration;
            contentEditable: string;
            enterKeyHint: string;
            inputMode: string;
            readonly isContentEditable: boolean;
            onabort: ((this: GlobalEventHandlers, ev: UIEvent) => any) | null;
            onanimationcancel: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null;
            onanimationend: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null;
            onanimationiteration: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null;
            onanimationstart: ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null;
            onauxclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onbeforeinput: ((this: GlobalEventHandlers, ev: InputEvent) => any) | null;
            onblur: ((this: GlobalEventHandlers, ev: FocusEvent) => any) | null;
            oncancel: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oncanplay: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oncanplaythrough: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onclose: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oncontextmenu: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            oncopy: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | null;
            oncuechange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oncut: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | null;
            ondblclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            ondrag: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragend: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragenter: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragleave: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragover: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondragstart: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondrop: ((this: GlobalEventHandlers, ev: DragEvent) => any) | null;
            ondurationchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onemptied: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onended: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onerror: OnErrorEventHandler;
            onfocus: ((this: GlobalEventHandlers, ev: FocusEvent) => any) | null;
            onformdata: ((this: GlobalEventHandlers, ev: FormDataEvent) => any) | null;
            ongotpointercapture: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            oninput: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            oninvalid: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onkeydown: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
            onkeypress: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
            onkeyup: ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null;
            onload: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onloadeddata: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onloadedmetadata: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onloadstart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onlostpointercapture: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onmousedown: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseenter: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseleave: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmousemove: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseout: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseover: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onmouseup: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
            onpaste: ((this: GlobalEventHandlers, ev: ClipboardEvent) => any) | null;
            onpause: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onplay: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onplaying: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onpointercancel: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerdown: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerenter: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerleave: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointermove: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerout: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerover: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onpointerup: ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null;
            onprogress: ((this: GlobalEventHandlers, ev: ProgressEvent<EventTarget>) => any) | null;
            onratechange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onreset: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onresize: ((this: GlobalEventHandlers, ev: UIEvent) => any) | null;
            onscroll: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onsecuritypolicyviolation: ((this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent) => any) | null;
            onseeked: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onseeking: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onselect: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onselectionchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onselectstart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onslotchange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onstalled: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onsubmit: ((this: GlobalEventHandlers, ev: SubmitEvent) => any) | null;
            onsuspend: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            ontimeupdate: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            ontoggle: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            ontouchcancel?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
            ontouchend?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
            ontouchmove?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
            ontouchstart?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;
            ontransitioncancel: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null;
            ontransitionend: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null;
            ontransitionrun: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null;
            ontransitionstart: ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null;
            onvolumechange: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwaiting: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwebkitanimationend: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwebkitanimationiteration: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwebkitanimationstart: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwebkittransitionend: ((this: GlobalEventHandlers, ev: Event) => any) | null;
            onwheel: ((this: GlobalEventHandlers, ev: WheelEvent) => any) | null;
            autofocus: boolean;
            readonly dataset: DOMStringMap;
            nonce?: string | undefined;
            tabIndex: number;
            blur(): void;
            focus(options?: FocusOptions | undefined): void;
        };
    };
    /**
     * Creates a new instance of a Raw element creator.
     *
     * @param doc A reference to the Document object over
     * which this Raw instance operates.
     */
    constructor(doc: Document);
    /**
     * Defines a custom element which derives from the specified constructor.
     */
    define(tagName: string, constructor?: typeof HTMLElement): void;
    /**
     * A function that creates a new DOM Text node, but which may be overridden
     * in the constructor to return a different but compatible value.
     */
    text(template: TemplateStringsArray, ...placeholders: (string | HTMLElement)[]): (Text | HTMLElement)[];
    text(string: string): Text;
    /**
     * Creates a new Raw context from the specified Element or series of Elements.
     */
    get<T extends Element | Raw.HatLike>(e: T, ...others: Element[]): (...params: Raw.Param[]) => T;
    get<T extends ShadowRoot>(e: T, ...others: Element[]): (...params: Raw.ShadowParam[]) => T;
    /**
     * An object that contains environment-agnostic guard functions
     * to make various assertions about data.
     */
    static readonly is: {
        node(n: any): n is Node;
        element(e: any): e is HTMLElement;
        text(t: any): t is Text;
        comment(c: any): c is Comment;
        shadow(c: any): c is ShadowRoot;
        /**
         * Returns a boolean value that indicates whether the specified
         * string is the name of a valid CSS property in camelCase format,
         * for example, "fontWeight".
         */
        property(name: string): boolean;
    };
    /**
     * Creates and returns a ShadowRoot, in order to access
     * the shadow DOM of a particular element.
     */
    shadow(...params: Raw.ShadowParam[]): Raw.Param;
    /**
     * Creates a DOM element using the standard JSX element creation call signature.
     * Any Raw.Param values that are strings are converted to DOM Text nodes rather
     * than class names.
     */
    jsx(tag: string, properties: Record<string, any> | null, ...params: Raw.Param[]): Element;
    /**
     * This is the main applicator method where all params are applied
     * to the target.
     *
     * PROCEED WITH CAUTION. This code is VERY performance sensitive.
     * It uses constructor checks instead of instanceof and typeof in an effort
     * to nullify any performance overhead. Be careful of changing this code
     * without having full knowledge of what you're doing. Chesterton's
     * fence rule applies here.
     */
    private apply;
    /** */
    static readonly Event: {
        new (target: Node | null, type: string, handler: (ev: Event) => void, options?: Readonly<AddEventListenerOptions>): {
            readonly target: Node | null;
            readonly type: string;
            readonly handler: (ev: Event) => void;
            readonly options: Readonly<AddEventListenerOptions>;
            /**
             * Stores the element that "hosts" the event, which is not necessarily
             * the target event. When the host element is removed from the DOM,
             * the event handler is removed.
             */
            host: Element | ShadowRoot | null;
        };
    };
    /** */
    on<K extends keyof Raw.EventMap>(type: K, listener: (this: HTMLElement, ev: Raw.EventMap[K]) => any, options?: boolean | EventListenerOptions): Raw.Event;
    /** */
    on<K extends keyof Raw.EventMap>(remoteTarget: Node | Window, type: K, listener: (this: HTMLElement, ev: Raw.EventMap[K]) => any, options?: boolean | EventListenerOptions): Raw.Event;
    /** */
    on<K extends keyof WindowEventMap>(remoteTarget: Window, type: K, listener: (this: Window, ev: WindowEventMap[K]) => any, options?: boolean | EventListenerOptions): Raw.Event;
    /** */
    private maybeInstallRootObserver;
    private hasInstalledRootObserver;
    private readonly awaitingConnection;
    /**
     * Creates an HTML <style> element with the specified attributes,
     * and with the specified CSS rules embedded.
     */
    style(attributes: Raw.ElementAttribute, ...components: (string | Raw.Style)[]): Raw.HTMLRawStyleElement;
    /**
     * Creates an HTML <style> element with the specified CSS rules embedded.
     */
    style(...components: (string | Raw.Style)[]): Raw.HTMLRawStyleElement;
    /**
     * Creates an HTML <style> element with the specified attributes,
     * and with the specified raw CSS text embedded.
     */
    style(attributes: Raw.ElementAttribute, ...rawCss: Text[]): Raw.HTMLRawStyleElement;
    /**
     * Creates an HTML <style> element that contains the specified raw CSS text embedded.
     */
    style(...rawCss: Text[]): Raw.HTMLRawStyleElement;
    /**
     * Creates a series of CSS rules internally, and returns a class that
     * can be applied to HTML elements in order to apply the rules to
     * them.
     */
    css(...components: Raw.CssParam[]): string;
    /**
     * Copies the rules that are connected to the specified CSS class
     * (which is expected to be a hash of CSS rules) so that they are
     * visible within the specified ShadowRoot.
     */
    private toShadow;
    /** */
    private applyCssToScope;
    /**
     * Stores a WeakMap of Sets of the hashes of the contents of each CSS rule
     * that has been applied to a given generated <style> element.
     */
    private static readonly ruleData;
    /** */
    private createCssRuleGroups;
    /** */
    private setProperty;
    /** */
    private toCssDashCase;
    /** */
    private trimImportant;
    /**
     * Returns the CSSStyleSheet that stores the CSS rules that should
     * target the specified element. If the element is within a shadow root,
     * the sheet that is returned is the one that is contained within this
     * shadow root.
     */
    private getScopedStyleElement;
    /**
     * Hash calculation function adapted from:
     * https://stackoverflow.com/a/52171480/133737
     */
    private hash;
}
declare namespace Raw {
    /**
     * Fake node class, which is compatible with the actual Node interface,
     * but done with minimal properties in order to not negatively affect
     * the quality of the autocompletion experience.
     */
    interface INodeLike {
        /** */
        readonly nodeType: number;
        /** */
        readonly nodeName: string;
        /** */
        readonly nodeValue: string | null;
    }
    /**
     * A class that describes the minimal set of members that need to
     * be implemented on HTML elements in order to create a custom
     * raw.js compatible IHTMLElementLike.
     */
    interface IHTMLElementLike extends INodeLike {
        /** Minimal append method. */
        append(node: string | INodeLike): void;
        /** Minimal classList object. */
        readonly classList: {
            add(className: string): void;
            toString(): string;
        };
    }
    /**
     * A type that describes the special HTMLStyleElement that is
     * returned from the raw.style() method with the RawJS-specific
     * expando method added.
     */
    type HTMLRawStyleElement = HTMLStyleElement & {
        /**
         * Attaches the <style> element to the same scope as the
         * specified Node. This will either be an HTML <head> element,
         * or a shadow root, depending on the location of the specified
         * Node. If no Node is provided, the <style> element is attached
         * to the global <head> element.
         */
        attach(nodeWithinScope?: Node): HTMLRawStyleElement;
    };
    /**
     * A class that describes the minimal set of members that need to
     * be implemented on fake CSSStyleSheet objects in order to create
     * a custom raw.js compatible ICSSStyleSheetLike.
     */
    interface ICSSStyleSheetLike {
        insertRule(index: number): number;
        deleteRule(index: number): void;
        readonly cssRules: {
            item(index: number): ICSSStyleRuleLike;
        };
    }
    /**
     * A class that describes the minimal set of members that need to
     * be implemented on fake CSSStyleRule objects in order to create
     * a custom raw.js compatible ICSSStyleRuleLike.
     */
    interface ICSSStyleRuleLike {
        readonly style: {
            setProperty(name: string, value: string, important?: string): void;
        };
    }
    /** */
    type ElementClosure = ((e: HTMLElement) => Param | Param[]);
    /** */
    type ShadowClosure = ((e: ShadowRoot) => Param | Param[]);
    /** */
    type HatLike = {
        readonly head: HTMLElement;
    };
    /** */
    type Param<T = ElementAttribute> = string | Raw.Event | ElementClosure | Param<T>[] | false | void | null | undefined | Promise<void> | INodeLike | Style | Partial<T> | HatLike;
    /** */
    type ShadowParam = Raw.Event | Raw.ShadowClosure | false | void | null | undefined | ShadowParam[] | Promise<void> | INodeLike;
    /** */
    interface ElementAttribute {
        accesskey: string;
        autocapitalize: boolean;
        autofocus: boolean;
        dir: string;
        draggable: boolean;
        contentEditable: boolean | string;
        enterkeyhint: string;
        name: string;
        id: string;
        class: string;
        style: string;
        spellcheck: boolean;
        tabIndex: number;
        title: string;
        data: Record<string, string | number | boolean>;
    }
    /** */
    interface BaseElementAttribute extends ElementAttribute {
        href: string;
    }
    /** */
    interface FormElementAttribute extends ElementAttribute {
        autocomplete: string;
        rel: string;
        action: string;
        enctype: string;
        method: string;
        noValidate: boolean;
        target: string;
    }
    /** */
    interface MetaElementAttribute extends ElementAttribute {
        charset: string;
        content: string;
        httpEquiv: string;
        itemprop: string;
    }
    /** */
    interface LinkElementAttribute extends ElementAttribute {
        crossorigin: boolean;
        fetchpriority: string;
        href: string;
        hreflang: string;
        imagesizes: string;
        imagesrcset: string;
        integrity: string;
        media: string;
        referrerpolicy: string;
        rel: string;
        type: string;
        sizes: string;
    }
    /** */
    interface ScriptElementAttribute extends ElementAttribute {
        type: string;
        src: string;
        defer: boolean;
    }
    /** */
    interface FrameElementAttribute extends ElementAttribute {
        allow: string;
        allowfullscreen: string;
        loading: string;
        referrerpolicy: string;
        src: string;
        srcdoc: string;
        sandbox: string;
    }
    /** */
    interface InputElementAttribute extends ElementAttribute {
        type: string;
        value: string;
        disabled: boolean;
        webkitdirectory: boolean;
        multiple: boolean;
        maxLength: number;
        accept: string;
        autocapitalize: boolean;
        autocorrect: boolean;
        autocomplete: boolean;
        placeholder: string;
    }
    /** */
    interface TextAreaElementAttribute extends ElementAttribute {
        value: string;
        disabled: boolean;
        placeholder: string;
        cols: number;
        rows: number;
    }
    /** */
    interface ImageElementAttribute extends ElementAttribute {
        src: string;
    }
    /** */
    interface AnchorElementAttribute extends ElementAttribute {
        href: string;
        target: string;
    }
    /** */
    interface VideoElementAttribute extends ElementAttribute {
        src: string;
        type: string;
        autoplay: boolean;
        loop: boolean;
        playsInline: boolean;
        controls: boolean;
        muted: boolean;
    }
}
declare namespace Raw {
    /**
     * Defines the prefix that is added to all CSS classes generated
     * with the .css() method.
     */
    const enum GeneratedClassPrefix {
        value = "-raw-"
    }
    /** */
    type CssParam = string | Raw.Style;
    /** */
    type Style = {
        [P in keyof CSSStyleDeclaration]?: P extends keyof NumericStyleDeclaration ? NumericStyleDeclaration[P] | NumericStyleDeclaration[P][] : CSSStyleDeclaration[P] | CSSStyleDeclaration[P][];
    };
    /**
     *
     */
    type NumericStyleDeclaration = {
        animationDelay: string | 0;
        animationDuration: string | 0;
        animationIterationCount: string | 0;
        backgroundPositionX: string | 0;
        backgroundPositionY: string | 0;
        blockSize: string | 0;
        border: string | 0;
        borderBlock: string | 0;
        borderBlockEnd: string | 0;
        borderBlockEndWidth: string | 0;
        borderBlockStart: string | 0;
        borderBlockStartWidth: string | 0;
        borderBlockWidth: string | 0;
        borderBottom: string | 0;
        borderBottomLeftRadius: string | 0;
        borderBottomRightRadius: string | 0;
        borderBottomWidth: string | 0;
        borderEndEndRadius: string | 0;
        borderEndStartRadius: string | 0;
        borderInline: string | 0;
        borderInlineEnd: string | 0;
        borderInlineEndWidth: string | 0;
        borderInlineStart: string | 0;
        borderInlineStartWidth: string | 0;
        borderInlineWidth: string | 0;
        borderLeft: string | 0;
        borderLeftWidth: string | 0;
        borderRadius: string | 0;
        borderRight: string | 0;
        borderRightWidth: string | 0;
        borderSpacing: string | 0;
        borderStartEndRadius: string | 0;
        borderStartStartRadius: string | 0;
        borderTop: string | 0;
        borderTopLeftRadius: string | 0;
        borderTopRightRadius: string | 0;
        borderTopWidth: string | 0;
        borderWidth: string | 0;
        bottom: string | 0;
        columnCount: string | number;
        columnGap: string | 0;
        columnRuleWidth: string | 0;
        columnSpan: string | 0;
        columnWidth: string | 0;
        columns: string | number;
        flexGrow: string | number;
        flexShrink: string | number;
        fontSize: string | 0;
        fontSizeAdjust: string | 0;
        fontWeight: string | number;
        gridAutoColumns: string | 0;
        gridColumn: string | number;
        gridColumnEnd: string | number;
        gridColumnGap: string | 0;
        gridColumnStart: string | number;
        gridRow: string | number;
        gridRowEnd: string | number;
        gridRowStart: string | number;
        gridTemplate: string | 0;
        gridTemplateAreas: string | 0;
        gridTemplateColumns: string | 0;
        gridTemplateRows: string | 0;
        height: string | number;
        inlineSize: string | 0;
        inset: string | 0;
        insetBlock: string | 0;
        insetBlockEnd: string | 0;
        insetBlockStart: string | 0;
        insetInline: string | 0;
        insetInlineEnd: string | 0;
        insetInlineStart: string | 0;
        left: string | 0;
        letterSpacing: string | 0;
        lineHeight: string | number;
        margin: string | 0;
        marginBlock: string | 0;
        marginBlockEnd: string | 0;
        marginBlockStart: string | 0;
        marginBottom: string | 0;
        marginInline: string | 0;
        marginInlineEnd: string | 0;
        marginInlineStart: string | 0;
        marginLeft: string | 0;
        marginRight: string | 0;
        marginTop: string | 0;
        maxBlockSize: string | 0;
        maxHeight: string | 0;
        maxInlineSize: string | 0;
        maxWidth: string | 0;
        minBlockSize: string | 0;
        minHeight: string | 0;
        minInlineSize: string | 0;
        minWidth: string | 0;
        offset: string | 0;
        offsetDistance: string | 0;
        offsetPath: string | 0;
        offsetRotate: string | 0;
        opacity: string | number;
        order: string | number;
        outline: string | 0;
        outlineOffset: string | 0;
        outlineWidth: string | 0;
        padding: string | 0;
        paddingBlock: string | 0;
        paddingBlockEnd: string | 0;
        paddingBlockStart: string | 0;
        paddingBottom: string | 0;
        paddingInline: string | 0;
        paddingInlineEnd: string | 0;
        paddingInlineStart: string | 0;
        paddingLeft: string | 0;
        paddingRight: string | 0;
        paddingTop: string | 0;
        paintOrder: string | 0;
        right: string | 0;
        rowGap: string | 0;
        scale: string | 0;
        scrollMargin: string | 0;
        scrollMarginBlock: string | 0;
        scrollMarginBlockEnd: string | 0;
        scrollMarginBlockStart: string | 0;
        scrollMarginBottom: string | 0;
        scrollMarginInline: string | 0;
        scrollMarginInlineEnd: string | 0;
        scrollMarginInlineStart: string | 0;
        scrollMarginLeft: string | 0;
        scrollMarginRight: string | 0;
        scrollMarginTop: string | 0;
        scrollPadding: string | 0;
        scrollPaddingBlock: string | 0;
        scrollPaddingBlockEnd: string | 0;
        scrollPaddingBlockStart: string | 0;
        scrollPaddingBottom: string | 0;
        scrollPaddingInline: string | 0;
        scrollPaddingInlineEnd: string | 0;
        scrollPaddingInlineStart: string | 0;
        scrollPaddingLeft: string | 0;
        scrollPaddingRight: string | 0;
        scrollPaddingTop: string | 0;
        tabSize: string | 0;
        textIndent: string | 0;
        top: string | 0;
        transitionDelay: string | 0;
        transitionDuration: string | 0;
        webkitMarginAfter: string | 0;
        webkitMarginBefore: string | 0;
        webkitMarginEnd: string | 0;
        webkitMarginStart: string | 0;
        width: string | number;
        wordSpacing: string | 0;
        zIndex: string | number;
    };
}
declare namespace Raw {
    /** */
    type Event = InstanceType<typeof Raw.Event>;
    /** */
    interface EventMap extends HTMLElementEventMap {
        "input": InputEvent;
        "connected": Event;
        "disconnected": Event;
        "rendered": Event;
    }
}
/**
 * Adds the CSS properties that are missing from the standard set
 * of type definitions. Any of these entries should be removed if
 * or when the definition is added upstream.
 */
interface CSSStyleDeclaration {
    backdropFilter: string;
    container: string;
    containerType: string;
    containerName: string;
    contentVisibility: string;
    webkitAppRegion: string;
    webkitBackdropFilter: string;
    webkitBorderAfter: string;
    webkitBorderAfterColor: string;
    webkitBorderAfterStyle: string;
    webkitBorderAfterWidth: string;
    webkitBorderBefore: string;
    webkitBorderBeforeColor: string;
    webkitBorderBeforeStyle: string;
    webkitBorderBeforeWidth: string;
    webkitBorderEnd: string;
    webkitBorderEndColor: string;
    webkitBorderEndStyle: string;
    webkitBorderEndWidth: string;
    webkitBorderHorizontalSpacing: string;
    webkitBorderStart: string;
    webkitBorderStartColor: string;
    webkitBorderStartStyle: string;
    webkitBorderStartWidth: string;
    webkitBorderTopLeftRadius: string;
    webkitBorderTopRightRadius: string;
    webkitBorderVerticalSpacing: string;
    webkitBoxDecorationBreak: string;
    webkitBoxDirection: string;
    webkitBoxFlex: string;
    webkitBoxOrdinalGroup: string;
    webkitBoxOrient: string;
    webkitBoxPack: string;
    webkitBoxReflect: string;
    webkitBoxShadow: string;
    webkitBoxSizing: string;
    webkitClipPath: string;
    webkitColumnBreakAfter: string;
    webkitColumnBreakBefore: string;
    webkitColumnBreakInside: string;
    webkitColumnCount: string;
    webkitColumnGap: string;
    webkitColumnRule: string;
    webkitColumnRuleColor: string;
    webkitColumnRuleStyle: string;
    webkitColumnRuleWidth: string;
    webkitColumnSpan: string;
    webkitColumnWidth: string;
    webkitColumns: string | number;
    webkitFontFeatureSettings: string;
    webkitFontSmoothing: string;
    webkitHighlight: string;
    webkitHyphenateCharacter: string;
    webkitLineBreak: string;
    webkitLineClamp: string;
    webkitLocale: string;
    webkitLogicalHeight: string;
    webkitLogicalWidth: string;
    webkitMaskComposite: string;
    webkitMaxLogicalHeight: string;
    webkitMaxLogicalWidth: string;
    webkitMinLogicalHeight: string;
    webkitMinLogicalWidth: string;
    webkitOpacity: string | number;
    webkitPaddingAfter: string;
    webkitPaddingBefore: string;
    webkitPaddingEnd: string;
    webkitPaddingStart: string;
    webkitPerspectiveOriginX: string;
    webkitPerspectiveOriginY: string;
    webkitPrintColorAdjust: string;
    webkitRtlOrdering: string;
    webkitRubyPosition: string;
    webkitShapeImageThreshold: string;
    webkitShapeMargin: string;
    webkitShapeOutside: string;
    webkitTapHighlightColor: string;
    webkitTextCombine: string;
    webkitTextDecorationsInEffect: string;
    webkitTextEmphasis: string;
    webkitTextEmphasisColor: string;
    webkitTextEmphasisPosition: string;
    webkitTextEmphasisStyle: string;
    webkitTextFillColor: string;
    webkitTextOrientation: string;
    webkitTextSecurity: string;
    webkitTextStroke: string;
    webkitTextStrokeColor: string;
    webkitTextStrokeWidth: string;
    webkitUserDrag: string;
    webkitUserModify: string;
    webkitWritingMode: string;
    scrollbarWidth: string;
    msOverflowStyle: string;
}
declare var raw: Raw;
declare module "@squaresapp/rawjs" {
    const __export: {
        raw: Raw;
        Raw: typeof Raw;
    };
    export = __export;
}
//# sourceMappingURL=raw.d.ts.map