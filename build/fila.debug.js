"use strict";
class Fila {
    /**
     * @internal
     * Abstract class that must be implemented by Fila backends.
     */
    static FilaBackend = (() => {
        class FilaBackend {
            fila;
            constructor(fila) {
                this.fila = fila;
            }
        }
        return FilaBackend;
    })();
    /**
     * @internal
     * Each backend calls this method to perform the setup functions.
     * This is the internal .setup() overload that is called by each implementor.
     */
    static setup(backend, sep, cwd, temp) {
        this.backend = backend;
        this._sep = sep || "/";
        this._cwd = cwd;
        this._temporary = temp;
    }
    static backend;
    /**
     * Path separator.
     */
    static get sep() {
        return this._sep;
    }
    static _sep = "/";
    /**
     * Gets the current working directory of the process.
     */
    static get cwd() {
        if (typeof this._cwd === "string")
            return this._cwd = new Fila(this._cwd);
        return this._cwd;
    }
    static _cwd = "";
    /**
     *
     */
    static get temporary() {
        if (typeof this._temporary === "string")
            return this._temporary = new Fila(this._temporary);
        return this._temporary;
    }
    static _temporary = "";
    /**
     * Returns a Fila instance from the specified path in the case when
     * a string is provided, or returns the Fila instance as-is when a Fila
     * object is provided.
     */
    static from(via) {
        return typeof via === "string" ? new Fila(via) : via;
    }
    /** */
    constructor(...components) {
        components = components.filter(s => !!s);
        if (components.join("") !== "/") {
            if (components.length === 0 || components[0].startsWith("."))
                components.unshift(Fila.cwd.path);
            for (let i = components.length; i-- > 0;)
                components.splice(i, 1, ...components[i].split(Fila.sep));
            components = components.filter(s => !!s);
            components = Fila.normalize(components.join(Fila.sep)).split(Fila.sep);
        }
        this.components = components;
        let back;
        //@ts-ignore
        back = new Fila.backend(this);
        this.back = back;
    }
    components;
    back;
    /** */
    readText() { return this.back.readText(); }
    /** */
    readBinary() { return this.back.readBinary(); }
    /** */
    readDirectory() { return this.back.readDirectory(); }
    /** */
    writeText(text, options) {
        return this.back.writeText(text, options);
    }
    /** */
    writeBinary(buffer) { return this.back.writeBinary(buffer); }
    /** */
    writeDirectory() { return this.back.writeDirectory(); }
    /**
     * Writes a symlink file at the location represented by the specified
     * Fila object, to the location specified by the current Fila object.
     */
    writeSymlink(at) { return this.back.writeSymlink(at); }
    /**
     * Deletes the file or directory that this Fila object represents.
     */
    delete() { return this.back.delete(); }
    /** */
    move(target) { return this.back.move(target); }
    /**
     * Copies the file to the specified location, and creates any
     * necessary directories along the way.
     */
    copy(target) { return this.back.copy(target); }
    /** */
    watch(a, b) {
        const recursive = a === "recursive";
        const callbackFn = b || a;
        return this.watchProtected(recursive, callbackFn);
    }
    /** */
    watchProtected(recursive, callbackFn) {
        return this.back.watchProtected(recursive, callbackFn);
    }
    /** */
    rename(newName) { return this.back.rename(newName); }
    /** */
    exists() { return this.back.exists(); }
    /** */
    getSize() { return this.back.getSize(); }
    /** */
    getModifiedTicks() { return this.back.getModifiedTicks(); }
    /** */
    getCreatedTicks() { return this.back.getCreatedTicks(); }
    /** */
    getAccessedTicks() { return this.back.getAccessedTicks(); }
    /** */
    isDirectory() { return this.back.isDirectory(); }
    /**
     * In the case when this Fila object represents a file, this method returns a
     * Fila object that represents the directory that contains said file.
     *
     * In the case when this Fila object represents a directory, this method
     * returns the current Fila object as-is.
     */
    async getDirectory() {
        if (await this.isDirectory())
            return this;
        return new Fila(...this.up().components);
    }
    /**
     * Gets the file or directory name of the file system object being
     * represented by this Fila object.
     */
    get name() {
        return this.components.at(-1) || "";
    }
    /**
     * Get the file extension of the file being represented by this
     * Fila object, with the "." character.
     */
    get extension() {
        const name = this.name;
        const lastDot = name.lastIndexOf(".");
        return lastDot < 0 ? "" : name.slice(lastDot);
    }
    /**
     * Gets the fully-qualified path, including any file name to the
     * file system object being represented by this Fila object.
     */
    get path() {
        return Fila.sep + Fila.join(...this.components);
    }
    /**
     * Returns a Fila object that represents the first or nth containing
     * directory of the object that this Fila object represents.
     * Returns the this reference in the case when the
     */
    up(count = 1) {
        if (this.components.length < 2)
            return this;
        const parentComponents = this.components.slice(0, -count);
        return parentComponents.length > 0 ?
            new Fila(...parentComponents) :
            new Fila("/");
    }
    /**
     * Searches upward through the file system ancestry for a nested file.
     */
    async upscan(relativeFileName) {
        let ancestry = this;
        do {
            const maybe = ancestry.down(relativeFileName);
            if (await maybe.exists())
                return maybe;
            if (ancestry.components.length === 1)
                break;
            ancestry = ancestry.up();
        } while (ancestry.components.length > 0);
        return null;
    }
    /**
     * Returns a Fila object that represents a file or directory nested
     * within the current Fila object (which must be a directory).
     */
    down(...additionalComponents) {
        return new Fila(...this.components, ...additionalComponents);
    }
}
(function (Fila) {
    /** */
    function join(...args) {
        if (args.length === 0)
            return ".";
        let joined;
        for (let i = 0; i < args.length; ++i) {
            let arg = args[i];
            if (arg.length > 0) {
                if (joined === undefined)
                    joined = arg;
                else
                    joined += "/" + arg;
            }
        }
        if (joined === undefined)
            return ".";
        return normalize(joined);
    }
    Fila.join = join;
    /** */
    function normalize(path) {
        if (path.length === 0)
            return ".";
        const isAbsolute = path.charCodeAt(0) === 47 /* Char.slash */;
        const trailingSeparator = path.charCodeAt(path.length - 1) === 47 /* Char.slash */;
        // Normalize the path
        path = normalizeStringPosix(path, !isAbsolute);
        if (path.length === 0 && !isAbsolute)
            path = ".";
        if (path.length > 0 && trailingSeparator)
            path += Fila.sep;
        if (isAbsolute)
            return Fila.sep + path;
        return path;
    }
    Fila.normalize = normalize;
    /** */
    function normalizeStringPosix(path, allowAboveRoot) {
        let res = "";
        let lastSegmentLength = 0;
        let lastSlash = -1;
        let dots = 0;
        let code;
        for (let i = 0; i <= path.length; ++i) {
            if (i < path.length)
                code = path.charCodeAt(i);
            else if (code === 47 /* Char.slash */)
                break;
            else
                code = 47 /* Char.slash */;
            if (code === 47 /* Char.slash */) {
                if (lastSlash === i - 1 || dots === 1) {
                    // NOOP
                }
                else if (lastSlash !== i - 1 && dots === 2) {
                    if (res.length < 2 ||
                        lastSegmentLength !== 2 ||
                        res.charCodeAt(res.length - 1) !== 46 /* Char.dot */ ||
                        res.charCodeAt(res.length - 2) !== 46 /* Char.dot */) {
                        if (res.length > 2) {
                            let lastSlashIndex = res.lastIndexOf(Fila.sep);
                            if (lastSlashIndex !== res.length - 1) {
                                if (lastSlashIndex === -1) {
                                    res = "";
                                    lastSegmentLength = 0;
                                }
                                else {
                                    res = res.slice(0, lastSlashIndex);
                                    lastSegmentLength = res.length - 1 - res.lastIndexOf(Fila.sep);
                                }
                                lastSlash = i;
                                dots = 0;
                                continue;
                            }
                        }
                        else if (res.length === 2 || res.length === 1) {
                            res = "";
                            lastSegmentLength = 0;
                            lastSlash = i;
                            dots = 0;
                            continue;
                        }
                    }
                    if (allowAboveRoot) {
                        if (res.length > 0)
                            res += "/..";
                        else
                            res = "..";
                        lastSegmentLength = 2;
                    }
                }
                else {
                    if (res.length > 0)
                        res += Fila.sep + path.slice(lastSlash + 1, i);
                    else
                        res = path.slice(lastSlash + 1, i);
                    lastSegmentLength = i - lastSlash - 1;
                }
                lastSlash = i;
                dots = 0;
            }
            else if (code === 46 /* Char.dot */ && dots !== -1) {
                ++dots;
            }
            else
                dots = -1;
        }
        return res;
    }
    /** */
    function relative(from, to) {
        if (from === to)
            return "";
        from = posix.resolve(from instanceof Fila ? from.path : from);
        to = posix.resolve(to instanceof Fila ? to.path : to);
        if (from === to)
            return "";
        // Trim any leading backslashes
        var fromStart = 1;
        for (; fromStart < from.length; ++fromStart)
            if (from.charCodeAt(fromStart) !== 47 /*/*/)
                break;
        var fromEnd = from.length;
        var fromLen = fromEnd - fromStart;
        // Trim any leading backslashes
        var toStart = 1;
        for (; toStart < to.length; ++toStart)
            if (to.charCodeAt(toStart) !== 47 /*/*/)
                break;
        var toEnd = to.length;
        var toLen = toEnd - toStart;
        // Compare paths to find the longest common path from root
        var length = fromLen < toLen ? fromLen : toLen;
        var lastCommonSep = -1;
        var i = 0;
        for (; i <= length; ++i) {
            if (i === length) {
                if (toLen > length) {
                    if (to.charCodeAt(toStart + i) === 47 /*/*/) {
                        // We get here if `from` is the exact base path for `to`.
                        // For example: from="/foo/bar"; to="/foo/bar/baz"
                        return to.slice(toStart + i + 1);
                    }
                    else if (i === 0) {
                        // We get here if `from` is the root
                        // For example: from="/"; to="/foo"
                        return to.slice(toStart + i);
                    }
                }
                else if (fromLen > length) {
                    if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
                        // We get here if `to` is the exact base path for `from`.
                        // For example: from="/foo/bar/baz"; to="/foo/bar"
                        lastCommonSep = i;
                    }
                    else if (i === 0) {
                        // We get here if `to` is the root.
                        // For example: from="/foo"; to="/"
                        lastCommonSep = 0;
                    }
                }
                break;
            }
            var fromCode = from.charCodeAt(fromStart + i);
            var toCode = to.charCodeAt(toStart + i);
            if (fromCode !== toCode)
                break;
            else if (fromCode === 47 /*/*/)
                lastCommonSep = i;
        }
        var out = "";
        // Generate the relative path based on the path difference between `to`
        // and `from`
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
            if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
                if (out.length === 0)
                    out += "..";
                else
                    out += "/..";
            }
        }
        // Lastly, append the rest of the destination (`to`) path that comes after
        // the common path parts
        if (out.length > 0)
            return out + to.slice(toStart + lastCommonSep);
        toStart += lastCommonSep;
        if (to.charCodeAt(toStart) === 47 /*/*/)
            ++toStart;
        return to.slice(toStart);
    }
    Fila.relative = relative;
    const posix = {
        resolve(...args) {
            var resolvedPath = "";
            var resolvedAbsolute = false;
            var cwd;
            for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
                var path;
                if (i >= 0)
                    path = args[i];
                else {
                    if (cwd === undefined && typeof process === "object")
                        cwd = process.cwd();
                    path = cwd;
                }
                // Skip empty entries
                if (path.length === 0)
                    continue;
                resolvedPath = path + "/" + resolvedPath;
                resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
            }
            // At this point the path should be resolved to a full absolute path, but
            // handle relative paths to be safe (might happen when process.cwd() fails)
            // Normalize the path
            resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);
            if (resolvedAbsolute) {
                if (resolvedPath.length > 0)
                    return "/" + resolvedPath;
                else
                    return "/";
            }
            else if (resolvedPath.length > 0)
                return resolvedPath;
            return ".";
        },
    };
    /** */
    let Char;
    (function (Char) {
        Char[Char["dot"] = 46] = "dot";
        Char[Char["slash"] = 47] = "slash";
    })(Char || (Char = {}));
    /** */
    let Event;
    (function (Event) {
        Event["create"] = "create";
        Event["modify"] = "modify";
        Event["delete"] = "delete";
    })(Event = Fila.Event || (Fila.Event = {}));
})(Fila || (Fila = {}));
//@ts-ignore CommonJS compatibility
typeof module === "object" && Object.assign(module.exports, { Fila });
(() => {
    if (typeof CAPACITOR === "undefined")
        Object.assign(globalThis, { CAPACITOR: typeof window !== "undefined" && typeof window.Capacitor !== "undefined" });
    //@ts-ignore
    if (!CAPACITOR)
        return;
    /** */
    class FilaCapacitor extends Fila.FilaBackend {
        /** */
        get fs() {
            const g = globalThis;
            const fs = g.Capacitor?.Plugins?.Filesystem;
            if (!fs)
                throw new Error("Filesystem plugin not added to Capacitor.");
            return fs;
        }
        /**
         * Gets the fully-qualified path, including any file name to the
         * file system object being represented by this Fila object.
         */
        get path() {
            return Fila.join(...this.fila.components);
        }
        /** */
        async readText() {
            const result = await this.fs.readFile({
                ...this.getDefaultOptions(),
                encoding: "utf8"
            });
            return result.data;
        }
        /** */
        async readBinary() {
            const result = await this.fs.readFile({
                ...this.getDefaultOptions(),
                encoding: "ascii"
            });
            // Does this work on iOS?
            const blob = result.data;
            const buffer = await new Response(blob).arrayBuffer();
            return new Uint8Array(buffer);
            //const base64 = result.data;
            //return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        }
        /** */
        async readDirectory() {
            const result = await this.fs.readdir(this.getDefaultOptions());
            const filas = [];
            for (const file of result.files)
                if (file.name !== ".DS_Store")
                    filas.push(new Fila(this.path, file.name || ""));
            return filas;
        }
        /** */
        async writeText(text, options) {
            try {
                const up = this.fila.up();
                if (!await up.exists())
                    await up.writeDirectory();
                const writeOptions = {
                    ...this.getDefaultOptions(),
                    data: text,
                    encoding: "utf8"
                };
                if (options?.append)
                    await this.fs.appendFile(writeOptions);
                else
                    await this.fs.writeFile(writeOptions);
            }
            catch (e) {
                console.error("Write failed to path: " + this.path);
                debugger;
            }
        }
        /** */
        async writeBinary(arrayBuffer) {
            await this.fila.up().writeDirectory();
            const data = await this.arrayBufferToBase64(arrayBuffer);
            await this.fs.writeFile({
                ...this.getDefaultOptions(),
                data,
                encoding: "ascii"
            });
        }
        /** */
        arrayBufferToBase64(buffer) {
            return new Promise(r => {
                const blob = new Blob([buffer], { type: "application/octet-binary" });
                const reader = new FileReader();
                reader.onload = ev => {
                    const dataUrl = (ev.target?.result || "");
                    const slice = dataUrl.slice(dataUrl.indexOf(`,`) + 1);
                    r(slice);
                };
                reader.readAsDataURL(blob);
            });
        }
        /** */
        async writeDirectory() {
            await this.fs.mkdir({
                ...this.getDefaultOptions(),
                recursive: true
            });
        }
        /**
         * Writes a symlink file at the location represented by the specified
         * Fila object, to the location specified by the current Fila object.
         */
        async writeSymlink(at) {
            throw new Error("Not implemented");
        }
        /**
         * Deletes the file or directory that this Fila object represents.
         */
        async delete() {
            if (await this.isDirectory()) {
                return new Promise(async (r) => {
                    await this.fs.rmdir({
                        ...this.getDefaultOptions(),
                        recursive: true
                    });
                    r();
                });
            }
            await this.fs.deleteFile(this.getDefaultOptions());
        }
        /** */
        async move(target) {
            throw new Error("Not implemented.");
        }
        /** */
        async copy(target) {
            const fromOptions = this.getDefaultOptions();
            const toOptions = this.getDefaultOptions(target.path);
            await this.fs.copy({
                from: fromOptions.path,
                directory: fromOptions.directory,
                to: toOptions.path,
                toDirectory: toOptions.directory,
            });
        }
        /** */
        async rename(newName) {
            const target = this.fila.up().down(newName).path;
            const fromOptions = this.getDefaultOptions();
            const toOptions = this.getDefaultOptions(target);
            await this.fs.rename({
                from: this.path,
                directory: fromOptions.directory,
                to: target,
                toDirectory: toOptions.directory
            });
        }
        /** */
        watchProtected(recursive, callbackFn) {
            throw new Error("Not implemented");
        }
        /** */
        async exists() {
            return !!await this.getStat();
        }
        /** */
        async getSize() {
            return (await this.getStat())?.size || 0;
        }
        /** */
        async getModifiedTicks() {
            return (await this.getStat())?.mtime || 0;
        }
        /** */
        async getCreatedTicks() {
            return (await this.getStat())?.ctime || 0;
        }
        /** */
        async getAccessedTicks() {
            return 0;
        }
        /** */
        async isDirectory() {
            return (await this.getStat())?.type === "directory";
        }
        /** */
        async getStat() {
            try {
                return await this.fs.stat(this.getDefaultOptions());
            }
            catch (e) {
                return null;
            }
        }
        /** */
        getDefaultOptions(targetPath = this.path) {
            const slash = targetPath.indexOf("/");
            let path = "";
            let directory = "";
            if (slash < 0) {
                path = targetPath;
                directory = "CACHE" /* Directory.cache */;
            }
            else {
                path = targetPath.slice(slash + 1);
                directory = targetPath.slice(0, slash);
            }
            const result = {
                path,
                directory: directory
            };
            return result;
        }
    }
    /** */
    let Directory;
    (function (Directory) {
        Directory["cache"] = "CACHE";
        Directory["data"] = "DATA";
        Directory["documents"] = "DOCUMENTS";
        Directory["external"] = "EXTERNAL";
        Directory["externalStorage"] = "EXTERNAL_STORAGE";
        Directory["library"] = "LIBRARY";
    })(Directory || (Directory = {}));
    const cwd = "DATA";
    const tmp = "CACHE";
    const sep = "/";
    Fila.setup(FilaCapacitor, sep, cwd, tmp);
})();
var Cover;
(function (Cover) {
    /** */
    async function coverFilaNode() {
        const fila = new Fila(process.cwd(), "FilaNode", "+sample");
        const x = fila.down("x");
        await fila.isDirectory();
        fila.watch((ev, fila) => {
            console.log(ev + ": " + fila.path);
        });
        process.stdin.resume();
    }
    Cover.coverFilaNode = coverFilaNode;
})(Cover || (Cover = {}));
typeof module === "object" && Object.assign(module.exports, { Cover });
(() => {
    if (typeof NODE === "undefined")
        Object.assign(globalThis, { NODE: typeof process + typeof require === "objectfunction" });
    //@ts-ignore
    if (!NODE)
        return;
    class FilaNode extends Fila.FilaBackend {
        /** */
        fs = require("fs");
        /** */
        async readText() {
            return await this.fs.promises.readFile(this.fila.path, "utf8");
        }
        /** */
        async readBinary() {
            return await this.fs.promises.readFile(this.fila.path);
        }
        /** */
        async readDirectory() {
            const fileNames = await this.fs.promises.readdir(this.fila.path);
            const filas = [];
            for (const fileName of fileNames)
                if (fileName !== ".DS_Store")
                    filas.push(new Fila(...this.fila.components, fileName));
            return filas;
        }
        /** */
        async writeText(text, options) {
            await this.fila.up().writeDirectory();
            if (options?.append)
                await this.fs.promises.appendFile(this.fila.path, text);
            else
                await this.fs.promises.writeFile(this.fila.path, text);
        }
        /** */
        async writeBinary(arrayBuffer) {
            await this.fila.up().writeDirectory();
            const buffer = Buffer.from(arrayBuffer);
            await this.fs.promises.writeFile(this.fila.path, buffer);
        }
        /** */
        async writeDirectory() {
            if (!this.fs.existsSync(this.fila.path))
                await this.fs.promises.mkdir(this.fila.path, { recursive: true });
        }
        /**
         * Writes a symlink file at the location represented by the specified
         * Fila object, to the location specified by the current Fila object.
         */
        async writeSymlink(at) {
            return new Promise(r => {
                this.fs.symlink(at.path, this.fila.path, () => {
                    r();
                });
            });
        }
        /**
         * Deletes the file or directory that this Fila object represents.
         */
        async delete() {
            if (await this.isDirectory()) {
                return new Promise(resolve => {
                    this.fs.rmdir(this.fila.path, { recursive: true }, error => {
                        resolve(error || void 0);
                    });
                });
            }
            await this.fs.promises.unlink(this.fila.path);
        }
        /** */
        move(target) {
            return new Promise(resolve => {
                this.fs.rename(this.fila.path, target.path, () => resolve());
            });
        }
        /** */
        copy(target) {
            return new Promise(async (resolve) => {
                if (await this.isDirectory()) {
                    this.fs.cp(this.fila.path, target.path, { recursive: true, force: true }, () => resolve());
                }
                else {
                    const dir = target.up();
                    if (!await dir.exists())
                        await new Promise(r => this.fs.mkdir(dir.path, { recursive: true }, r));
                    this.fs.copyFile(this.fila.path, target.path, () => resolve());
                }
            });
        }
        /** */
        watchProtected(recursive, callbackFn) {
            const watcher = FilaNode.chokidar.watch(this.fila.path);
            watcher.on("ready", () => {
                watcher.on("all", (evName, path) => {
                    if (path.endsWith("/.DS_Store"))
                        return;
                    let ev;
                    if (evName === "add")
                        ev = "create" /* Fila.Event.create */;
                    else if (evName === "change")
                        ev = "modify" /* Fila.Event.modify */;
                    else if (evName === "unlink")
                        ev = "delete" /* Fila.Event.delete */;
                    if (ev)
                        callbackFn(ev, new Fila(path));
                });
            });
            return () => { watcher.removeAllListeners(); };
        }
        /** */
        static get chokidar() {
            return this._chokidar || (this._chokidar = require("chokidar"));
        }
        static _chokidar;
        /** */
        rename(newName) {
            return this.fs.promises.rename(this.fila.path, this.fila.up().down(newName).path);
        }
        /** */
        async exists() {
            return new Promise(r => {
                this.fs.stat(this.fila.path, error => {
                    r(!error);
                });
            });
        }
        /** */
        async getSize() {
            const stats = await this.getStats();
            return stats?.size || 0;
        }
        /** */
        async getModifiedTicks() {
            const stats = await this.getStats();
            return stats?.mtimeMs || 0;
        }
        /** */
        async getCreatedTicks() {
            const stats = await this.getStats();
            return stats?.birthtimeMs || 0;
        }
        /** */
        async getAccessedTicks() {
            const stats = await this.getStats();
            return stats?.atimeMs || 0;
        }
        /** */
        async isDirectory() {
            const stats = await this.getStats();
            return stats?.isDirectory() || false;
        }
        /** */
        async getStats() {
            return new Promise(r => {
                this.fs.stat(this.fila.path, (error, stats) => {
                    r(stats);
                });
            });
        }
    }
    const sep = require("path").sep;
    const cwd = process.cwd();
    const tmp = require("os").tmpdir();
    Fila.setup(FilaNode, sep, cwd, tmp);
})();
(() => {
    if (typeof TAURI === "undefined")
        Object.assign(globalThis, { TAURI: typeof window !== "undefined" && typeof globalThis.__TAURI__ !== "undefined" });
    //@ts-ignore
    if (!TAURI)
        return;
    class FilaTauri extends Fila.FilaBackend {
        /** */
        fs = globalThis.__TAURI__.fs;
        /** */
        readText() {
            return this.fs.readTextFile(this.fila.path);
        }
        /** */
        readBinary() {
            return this.fs.readBinaryFile(this.fila.path);
        }
        /** */
        async readDirectory() {
            const fileNames = await this.fs.readDir(this.fila.path);
            const filas = [];
            for (const fileName of fileNames)
                if (fileName.name !== ".DS_Store")
                    filas.push(new Fila(this.fila.path, fileName.name || ""));
            return filas;
        }
        /** */
        async writeText(text, options) {
            try {
                const up = this.fila.up();
                if (!await up.exists())
                    await up.writeDirectory();
                await this.fs.writeTextFile(this.fila.path, text, {
                    append: options?.append
                });
            }
            catch (e) {
                debugger;
            }
        }
        /** */
        async writeBinary(arrayBuffer) {
            await this.fila.up().writeDirectory();
            await this.fs.writeBinaryFile(this.fila.path, arrayBuffer);
        }
        /** */
        async writeDirectory() {
            this.fs.createDir(this.fila.path, { recursive: true });
        }
        /**
         * Writes a symlink file at the location represented by the specified
         * Fila object, to the location specified by the current Fila object.
         */
        async writeSymlink(at) {
            return null;
        }
        /**
         * Deletes the file or directory that this Fila object represents.
         */
        async delete() {
            if (await this.isDirectory()) {
                return new Promise(async (resolve) => {
                    await this.fs.removeDir(this.fila.path, { recursive: true });
                    resolve();
                });
            }
            await this.fs.removeFile(this.fila.path);
        }
        /** */
        move(target) {
            return null;
        }
        /** */
        async copy(target) {
            if (await target.exists())
                if (await target.isDirectory())
                    throw "Copying directories is not implemented.";
            await this.fs.copyFile(this.fila.path, target.path);
        }
        /** */
        watchProtected(recursive, callbackFn) {
            let un = null;
            (async () => {
                un = await watchInternal(this.fila.path, {}, async (ev) => {
                    if (!un)
                        return;
                    const payload = ev.payload.payload;
                    if (typeof payload !== "string")
                        return;
                    const fila = new Fila(ev.payload.payload);
                    if (ev.type === "NoticeWrite" || ev.type === "Write")
                        callbackFn("modify" /* Fila.Event.modify */, fila);
                    else if (ev.type === "NoticeRemove" || ev.type === "Remove")
                        callbackFn("delete" /* Fila.Event.delete */, fila);
                    else if (ev.type === "Create" || ev.type === "Rename")
                        callbackFn("modify" /* Fila.Event.modify */, fila);
                });
            })();
            return () => {
                // This is hacky... the interface expects a function to be
                // returned rather than a promise that resolves to one,
                // so this waits 100ms to call the un() function if this unwatch
                // function is invoked immediately after calling watch().
                if (un)
                    un();
                else
                    setTimeout(() => un?.(), 100);
            };
        }
        /** */
        async rename(newName) {
            // Note that the "renameFile" method actually works on directories
            return this.fs.renameFile(this.fila.path, this.fila.up().down(newName).path);
        }
        /** */
        async exists() {
            return this.fs.exists(this.fila.path);
        }
        /** */
        async getSize() {
            return (await this.getMeta()).size;
        }
        /** */
        async getModifiedTicks() {
            return (await this.getMeta()).modifiedAt;
        }
        /** */
        async getCreatedTicks() {
            return (await this.getMeta()).createdAt;
        }
        /** */
        async getAccessedTicks() {
            return (await this.getMeta()).accessedAt;
        }
        /** */
        async isDirectory() {
            return (await this.getMeta()).isDir;
        }
        /** */
        async getMeta() {
            return this._meta || (this._meta = await getMetadata(this.fila.path));
        }
        _meta = null;
    }
    const t = globalThis.__TAURI__;
    const tauri = t.tauri;
    const wind = t.window;
    /** @internal */
    async function unwatch(id) {
        await tauri.invoke('plugin:fs-watch|unwatch', { id });
    }
    /** @internal */
    async function watchInternal(paths, options, callbackFn) {
        const opts = {
            recursive: false,
            delayMs: 2000,
            ...options,
        };
        let watchPaths;
        if (typeof paths === "string")
            watchPaths = [paths];
        else
            watchPaths = paths;
        const id = window.crypto.getRandomValues(new Uint32Array(1))[0];
        await tauri.invoke("plugin:fs-watch|watch", {
            id,
            paths: watchPaths,
            options: opts,
        });
        const unlisten = await wind.appWindow.listen(`watcher://raw-event/${id}`, event => {
            callbackFn(event);
        });
        return async () => {
            await unwatch(id);
            unlisten();
        };
    }
    /** @internal */
    async function watchImmediate(paths, options, callbackFn) {
        const opts = {
            recursive: false,
            ...options,
            delayMs: null
        };
        const watchPaths = typeof paths === "string" ? [paths] : paths;
        const id = window.crypto.getRandomValues(new Uint32Array(1))[0];
        await tauri.invoke("plugin:fs-watch|watch", {
            id,
            paths: watchPaths,
            options: opts,
        });
        const unlisten = await wind.appWindow.listen(`watcher://raw-event/${id}`, event => {
            callbackFn(event);
        });
        return async () => {
            await unwatch(id);
            unlisten();
        };
    }
    /** @internal */
    function getMetadata(path) {
        return tauri.invoke("plugin:fs-extra|metadata", { path });
    }
    {
        let path = null;
        try {
            path = globalThis.__TAURI__.path;
        }
        catch (e) {
            console.log("withGlobalTauri is not set");
            return;
        }
        const sep = path?.sep || "/";
        const cwd = "/";
        const tmp = "/";
        Fila.setup(FilaTauri, sep, cwd, tmp);
        (async () => {
            // This is a huge hack... but without this, the setup needs
            // some async which means that it can't be done
            const tmp = await path.appCacheDir();
            Fila.setup(FilaTauri, sep, cwd, tmp);
        })();
    }
})();
var Cover;
(function (Cover) {
    /** */
    async function coverFilaWeb() {
        const dir = new Fila("dir");
        dir.writeDirectory();
        const filaText = dir.down("file.txt");
        await filaText.writeText("yay!");
        const filaBinary = dir.down("file.bin");
        const buffer = new Uint8Array([0, 1, 2]);
        await filaBinary.writeBinary(buffer);
        const contents = await dir.readDirectory();
        for (const fila of contents)
            console.log(fila.path);
        await dir.delete();
        debugger;
    }
    Cover.coverFilaWeb = coverFilaWeb;
    typeof module === "object" && Object.assign(module.exports, { Cover });
})(Cover || (Cover = {}));
(() => {
    if (typeof WEB === "undefined")
        Object.assign(globalThis, { WEB: !NODE && !CAPACITOR && !TAURI && typeof indexedDB === "object" });
    //@ts-ignore
    if (!WEB)
        return;
    class FilaWeb extends Fila.FilaBackend {
        /** @internal */
        static keyva;
        /** */
        constructor(fila) {
            super(fila);
            FilaWeb.keyva ||= new Keyva({ name: "fila" });
        }
        /** */
        async readText() {
            return await FilaWeb.keyva.get(this.fila.path);
        }
        /** */
        async readBinary() {
            const value = await FilaWeb.keyva.get(this.fila.path);
            return value instanceof ArrayBuffer ?
                value :
                new TextEncoder().encode(value);
        }
        /** */
        async readDirectory() {
            const filas = [];
            const range = Keyva.prefix(this.fila.path + "/");
            const contents = await FilaWeb.keyva.each({ range }, "keys");
            for (const key of contents)
                if (typeof key === "string")
                    filas.push(new Fila(key));
            return filas;
        }
        /** */
        async writeText(text, options) {
            let current = this.fila.up();
            const missingFolders = [];
            for (;;) {
                if (await current.exists())
                    break;
                missingFolders.push(current);
                if (current.up().path === current.path)
                    break;
                current = current.up();
            }
            for (const folder of missingFolders)
                await folder.writeDirectory();
            if (options?.append)
                text = ("" + (await FilaWeb.keyva.get(this.fila.path) || "")) + text;
            await FilaWeb.keyva.set(this.fila.path, text);
        }
        /** */
        async writeBinary(arrayBuffer) {
            await FilaWeb.keyva.set(this.fila.path, arrayBuffer);
        }
        /** */
        async writeDirectory() {
            if (await this.isDirectory())
                return;
            if (await this.exists())
                throw new Error("A file already exists at this location.");
            await FilaWeb.keyva.set(this.fila.path, null);
        }
        /**
         * Writes a symlink file at the location represented by the specified
         * Fila object, to the location specified by the current Fila object.
         */
        async writeSymlink(at) {
            throw new Error("Not implemented");
        }
        /**
         * Deletes the file or directory that this Fila object represents.
         */
        async delete() {
            if (await this.isDirectory()) {
                const range = Keyva.prefix(this.fila.path + "/");
                await FilaWeb.keyva.delete(range);
            }
            await FilaWeb.keyva.delete(this.fila.path);
        }
        /** */
        async move(target) {
            throw new Error("Not implemented.");
        }
        /** */
        async copy(target) {
            throw new Error("Not implemented.");
        }
        /** */
        watchProtected(recursive, callbackFn) {
            throw new Error("Not implemented");
            return () => { };
        }
        /** */
        async rename(newName) {
            throw new Error("Not implemented.");
        }
        /** */
        async exists() {
            const value = await FilaWeb.keyva.get(this.fila.path);
            return value !== undefined;
        }
        /** */
        async getSize() {
            return 0;
        }
        /** */
        async getModifiedTicks() {
            return 0;
        }
        /** */
        async getCreatedTicks() {
            return 0;
        }
        /** */
        async getAccessedTicks() {
            return 0;
        }
        /** */
        async isDirectory() {
            return await FilaWeb.keyva.get(this.fila.path) === null;
        }
    }
    Fila.setup(FilaWeb, "/", "/", "/__temp/");
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsYS5kZWJ1Zy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2ZpbGEvRmlsYS50cyIsIi4uL2ZpbGEtY2FwYWNpdG9yL0ZpbGFDYXBhY2l0b3IudHMiLCIuLi9maWxhLW5vZGUvRmlsYU5vZGUuY292ZXIudHMiLCIuLi9maWxhLW5vZGUvRmlsYU5vZGUudHMiLCIuLi9maWxhLXRhdXJpL0ZpbGFUYXVyaS50cyIsIi4uL2ZpbGEtd2ViL0ZpbGFXZWIuY292ZXIudHMiLCIuLi9maWxhLXdlYi9GaWxhV2ViLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxNQUFNLElBQUk7SUFFVDs7O09BR0c7SUFDSCxNQUFNLENBQVUsV0FBVyxHQUFHLENBQUMsR0FBRyxFQUFFO1FBRW5DLE1BQWUsV0FBVztZQUVNO1lBQS9CLFlBQStCLElBQVU7Z0JBQVYsU0FBSSxHQUFKLElBQUksQ0FBTTtZQUFJLENBQUM7U0F3QjlDO1FBRUQsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUVMOzs7O09BSUc7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQWdDLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxJQUFZO1FBRXBGLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUssQ0FBQztJQUN6QixDQUFDO0lBRU8sTUFBTSxDQUFDLE9BQU8sQ0FBMEI7SUFFaEQ7O09BRUc7SUFDSCxNQUFNLEtBQUssR0FBRztRQUViLE9BQU8sSUFBSSxDQUFDLElBQWtCLENBQUM7SUFDaEMsQ0FBQztJQUNPLE1BQU0sQ0FBQyxJQUFJLEdBQVcsR0FBRyxDQUFDO0lBRWxDOztPQUVHO0lBQ0gsTUFBTSxLQUFLLEdBQUc7UUFFYixJQUFJLE9B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QUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RELE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQztRQUM1QixDQUFDO1FBRUQsTUFBTTtRQUNOLEtBQUssQ0FBQyxPQUFPO1lBRVosT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBRUQsTUFBTTtRQUNOLEtBQUssQ0FBQyxnQkFBZ0I7WUFFckIsT0FBTyxDQUFDLENBQUM7UUFDVixDQUFDO1FBRUQsTUFBTTtRQUNOLEtBQUssQ0FBQyxlQUFlO1lBRXBCLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUVELE1BQU07UUFDTixLQUFLLENBQUMsZ0JBQWdCO1lBRXJCLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUVELE1BQU07UUFDTixLQUFLLENBQUMsV0FBVztZQUVoQixPQUFPLE1BQU0sT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUM7UUFDekQsQ0FBQztLQUNEO0lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiXG5jbGFzcyBGaWxhXG57XG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogQWJzdHJhY3QgY2xhc3MgdGhhdCBtdXN0IGJlIGltcGxlbWVudGVkIGJ5IEZpbGEgYmFja2VuZHMuXG5cdCAqL1xuXHRzdGF0aWMgcmVhZG9ubHkgRmlsYUJhY2tlbmQgPSAoKCkgPT5cblx0e1xuXHRcdGFic3RyYWN0IGNsYXNzIEZpbGFCYWNrZW5kXG5cdFx0e1xuXHRcdFx0Y29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IGZpbGE6IEZpbGEpIHsgfVxuXHRcdFx0XG5cdFx0XHRhYnN0cmFjdCByZWFkVGV4dCgpOiBQcm9taXNlPHN0cmluZz47XG5cdFx0XHRhYnN0cmFjdCByZWFkQmluYXJ5KCk6IFByb21pc2U8QXJyYXlCdWZmZXI+O1xuXHRcdFx0YWJzdHJhY3QgcmVhZERpcmVjdG9yeSgpOiBQcm9taXNlPEZpbGFbXT47XG5cdFx0XHRhYnN0cmFjdCB3cml0ZVRleHQodGV4dDogc3RyaW5nLCBvcHRpb25zPzogRmlsYS5JV3JpdGVUZXh0T3B0aW9ucyk6IFByb21pc2U8dm9pZD47XG5cdFx0XHRhYnN0cmFjdCB3cml0ZUJpbmFyeShidWZmZXI6IEFycmF5QnVmZmVyKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdGFic3RyYWN0IHdyaXRlRGlyZWN0b3J5KCk6IFByb21pc2U8dm9pZD47XG5cdFx0XHRhYnN0cmFjdCB3cml0ZVN5bWxpbmsoYXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3QgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPjtcblx0XHRcdGFic3RyYWN0IG1vdmUodGFyZ2V0OiBGaWxhKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdGFic3RyYWN0IGNvcHkodGFyZ2V0OiBGaWxhKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdFxuXHRcdFx0YWJzdHJhY3Qgd2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRcdHJlY3Vyc2l2ZTogYm9vbGVhbiwgXG5cdFx0XHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZCk6ICgpID0+IHZvaWQ7XG5cdFx0XHRcblx0XHRcdGFic3RyYWN0IHJlbmFtZShuZXdOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3QgZXhpc3RzKCk6IFByb21pc2U8Ym9vbGVhbj47XG5cdFx0XHRhYnN0cmFjdCBnZXRTaXplKCk6IFByb21pc2U8bnVtYmVyPjtcblx0XHRcdGFic3RyYWN0IGdldE1vZGlmaWVkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+O1xuXHRcdFx0YWJzdHJhY3QgZ2V0Q3JlYXRlZFRpY2tzKCk6IFByb21pc2U8bnVtYmVyPjtcblx0XHRcdGFic3RyYWN0IGdldEFjY2Vzc2VkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+O1xuXHRcdFx0YWJzdHJhY3QgaXNEaXJlY3RvcnkoKTogUHJvbWlzZTxib29sZWFuPjtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIEZpbGFCYWNrZW5kO1xuXHR9KSgpO1xuXHRcblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKiBFYWNoIGJhY2tlbmQgY2FsbHMgdGhpcyBtZXRob2QgdG8gcGVyZm9ybSB0aGUgc2V0dXAgZnVuY3Rpb25zLlxuXHQgKiBUaGlzIGlzIHRoZSBpbnRlcm5hbCAuc2V0dXAoKSBvdmVybG9hZCB0aGF0IGlzIGNhbGxlZCBieSBlYWNoIGltcGxlbWVudG9yLlxuXHQgKi9cblx0c3RhdGljIHNldHVwKGJhY2tlbmQ6IHR5cGVvZiBGaWxhLkZpbGFCYWNrZW5kLCBzZXA6IHN0cmluZywgY3dkOiBzdHJpbmcsIHRlbXA6IHN0cmluZylcblx0e1xuXHRcdHRoaXMuYmFja2VuZCA9IGJhY2tlbmQ7XG5cdFx0dGhpcy5fc2VwID0gc2VwIHx8IFwiL1wiO1xuXHRcdHRoaXMuX2N3ZCA9IGN3ZCE7XG5cdFx0dGhpcy5fdGVtcG9yYXJ5ID0gdGVtcCE7XG5cdH1cblx0XG5cdHByaXZhdGUgc3RhdGljIGJhY2tlbmQ6IHR5cGVvZiBGaWxhLkZpbGFCYWNrZW5kO1xuXHRcblx0LyoqXG5cdCAqIFBhdGggc2VwYXJhdG9yLlxuXHQgKi9cblx0c3RhdGljIGdldCBzZXAoKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuX3NlcCBhcyBcIlxcXFxcIiB8IFwiL1wiO1xuXHR9XG5cdHByaXZhdGUgc3RhdGljIF9zZXA6IHN0cmluZyA9IFwiL1wiO1xuXHRcblx0LyoqXG5cdCAqIEdldHMgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIHByb2Nlc3MuXG5cdCAqL1xuXHRzdGF0aWMgZ2V0IGN3ZCgpXG5cdHtcblx0XHRpZiAodHlwZW9mIHRoaXMuX2N3ZCA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHJldHVybiB0aGlzLl9jd2QgPSBuZXcgRmlsYSh0aGlzLl9jd2QpO1xuXHRcdFxuXHRcdHJldHVybiB0aGlzLl9jd2Q7XG5cdH1cblx0cHJpdmF0ZSBzdGF0aWMgX2N3ZDogRmlsYSB8IHN0cmluZyA9IFwiXCI7XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRzdGF0aWMgZ2V0IHRlbXBvcmFyeSgpXG5cdHtcblx0XHRpZiAodHlwZW9mIHRoaXMuX3RlbXBvcmFyeSA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHJldHVybiB0aGlzLl90ZW1wb3JhcnkgPSBuZXcgRmlsYSh0aGlzLl90ZW1wb3JhcnkpO1xuXHRcdFxuXHRcdHJldHVybiB0aGlzLl90ZW1wb3Jhcnk7XG5cdH1cblx0cHJpdmF0ZSBzdGF0aWMgX3RlbXBvcmFyeTogRmlsYSB8IHN0cmluZyA9IFwiXCI7XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIEZpbGEgaW5zdGFuY2UgZnJvbSB0aGUgc3BlY2lmaWVkIHBhdGggaW4gdGhlIGNhc2Ugd2hlblxuXHQgKiBhIHN0cmluZyBpcyBwcm92aWRlZCwgb3IgcmV0dXJucyB0aGUgRmlsYSBpbnN0YW5jZSBhcy1pcyB3aGVuIGEgRmlsYVxuXHQgKiBvYmplY3QgaXMgcHJvdmlkZWQuXG5cdCAqL1xuXHRzdGF0aWMgZnJvbSh2aWE6IHN0cmluZyB8IEZpbGEpXG5cdHtcblx0XHRyZXR1cm4gdHlwZW9mIHZpYSA9PT0gXCJzdHJpbmdcIiA/IG5ldyBGaWxhKHZpYSkgOiB2aWE7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRjb25zdHJ1Y3RvciguLi5jb21wb25lbnRzOiBzdHJpbmdbXSlcblx0e1xuXHRcdGNvbXBvbmVudHMgPSBjb21wb25lbnRzLmZpbHRlcihzID0+ICEhcyk7XG5cdFx0XG5cdFx0aWYgKGNvbXBvbmVudHMuam9pbihcIlwiKSAhPT0gXCIvXCIpXG5cdFx0e1xuXHRcdFx0aWYgKGNvbXBvbmVudHMubGVuZ3RoID09PSAwIHx8IGNvbXBvbmVudHNbMF0uc3RhcnRzV2l0aChcIi5cIikpXG5cdFx0XHRcdGNvbXBvbmVudHMudW5zaGlmdChGaWxhLmN3ZC5wYXRoKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IGNvbXBvbmVudHMubGVuZ3RoOyBpLS0gPiAwOylcblx0XHRcdFx0Y29tcG9uZW50cy5zcGxpY2UoaSwgMSwgLi4uY29tcG9uZW50c1tpXS5zcGxpdChGaWxhLnNlcCkpO1xuXHRcdFx0XG5cdFx0XHRjb21wb25lbnRzID0gY29tcG9uZW50cy5maWx0ZXIocyA9PiAhIXMpO1xuXHRcdFx0Y29tcG9uZW50cyA9IEZpbGEubm9ybWFsaXplKGNvbXBvbmVudHMuam9pbihGaWxhLnNlcCkpLnNwbGl0KEZpbGEuc2VwKTtcblx0XHR9XG5cdFx0XG5cdFx0dGhpcy5jb21wb25lbnRzID0gY29tcG9uZW50cztcblx0XHRsZXQgYmFjazogSW5zdGFuY2VUeXBlPHR5cGVvZiBGaWxhLkZpbGFCYWNrZW5kPjtcblx0XHQvL0B0cy1pZ25vcmVcblx0XHRiYWNrID0gbmV3IEZpbGEuYmFja2VuZCh0aGlzKTtcblx0XHR0aGlzLmJhY2sgPSBiYWNrO1xuXHR9XG5cdFxuXHRyZWFkb25seSBjb21wb25lbnRzO1xuXHRwcml2YXRlIHJlYWRvbmx5IGJhY2s6IEluc3RhbmNlVHlwZTx0eXBlb2YgRmlsYS5GaWxhQmFja2VuZD47XG5cdFxuXHQvKiogKi9cblx0cmVhZFRleHQoKTogUHJvbWlzZTxzdHJpbmc+IHsgcmV0dXJuIHRoaXMuYmFjay5yZWFkVGV4dCgpOyB9XG5cdFxuXHQvKiogKi9cblx0cmVhZEJpbmFyeSgpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7IHJldHVybiB0aGlzLmJhY2sucmVhZEJpbmFyeSgpOyB9XG5cdFxuXHQvKiogKi9cblx0cmVhZERpcmVjdG9yeSgpOiBQcm9taXNlPEZpbGFbXT4geyByZXR1cm4gdGhpcy5iYWNrLnJlYWREaXJlY3RvcnkoKTsgfVxuXHRcblx0LyoqICovXG5cdHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKTogUHJvbWlzZTx2b2lkPlxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuYmFjay53cml0ZVRleHQodGV4dCwgb3B0aW9ucyk7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHR3cml0ZUJpbmFyeShidWZmZXI6IEFycmF5QnVmZmVyKTogUHJvbWlzZTx2b2lkPiB7IHJldHVybiB0aGlzLmJhY2sud3JpdGVCaW5hcnkoYnVmZmVyKTsgfVxuXHRcblx0LyoqICovXG5cdHdyaXRlRGlyZWN0b3J5KCk6IFByb21pc2U8dm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLndyaXRlRGlyZWN0b3J5KCk7IH1cblx0XG5cdC8qKlxuXHQgKiBXcml0ZXMgYSBzeW1saW5rIGZpbGUgYXQgdGhlIGxvY2F0aW9uIHJlcHJlc2VudGVkIGJ5IHRoZSBzcGVjaWZpZWRcblx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdCAqL1xuXHR3cml0ZVN5bWxpbmsoYXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay53cml0ZVN5bWxpbmsoYXQpOyB9XG5cdFxuXHQvKipcblx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdCAqL1xuXHRkZWxldGUoKTogUHJvbWlzZTxFcnJvciB8IHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay5kZWxldGUoKTsgfVxuXHRcblx0LyoqICovXG5cdG1vdmUodGFyZ2V0OiBGaWxhKTogUHJvbWlzZTx2b2lkPiB7IHJldHVybiB0aGlzLmJhY2subW92ZSh0YXJnZXQpOyB9XG5cdFxuXHQvKipcblx0ICogQ29waWVzIHRoZSBmaWxlIHRvIHRoZSBzcGVjaWZpZWQgbG9jYXRpb24sIGFuZCBjcmVhdGVzIGFueVxuXHQgKiBuZWNlc3NhcnkgZGlyZWN0b3JpZXMgYWxvbmcgdGhlIHdheS5cblx0ICovXG5cdGNvcHkodGFyZ2V0OiBGaWxhKTogUHJvbWlzZTx2b2lkPiB7IHJldHVybiB0aGlzLmJhY2suY29weSh0YXJnZXQpOyB9XG5cdFxuXHQvKipcblx0ICogUmVjdXJzaXZlbHkgd2F0Y2hlcyB0aGlzIGZvbGRlciwgYW5kIGFsbCBuZXN0ZWQgZmlsZXMgY29udGFpbmVkXG5cdCAqIHdpdGhpbiBhbGwgc3ViZm9sZGVycy4gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgdGVybWluYXRlc1xuXHQgKiB0aGUgd2F0Y2ggc2VydmljZSB3aGVuIGNhbGxlZC5cblx0ICovXG5cdHdhdGNoKFxuXHRcdHJlY3Vyc2l2ZTogXCJyZWN1cnNpdmVcIixcblx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpOiAoKSA9PiB2b2lkO1xuXHQvKipcblx0ICogV2F0Y2hlcyBmb3IgY2hhbmdlcyB0byB0aGUgc3BlY2lmaWVkIGZpbGUgb3IgZm9sZGVyLiBSZXR1cm5zXG5cdCAqIGEgZnVuY3Rpb24gdGhhdCB0ZXJtaW5hdGVzIHRoZSB3YXRjaCBzZXJ2aWNlIHdoZW4gY2FsbGVkLlxuXHQgKi9cblx0d2F0Y2goXG5cdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKTogKCkgPT4gdm9pZDtcblx0LyoqICovXG5cdHdhdGNoKGE6IGFueSwgYj86IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZClcblx0e1xuXHRcdGNvbnN0IHJlY3Vyc2l2ZSA9IGEgPT09IFwicmVjdXJzaXZlXCI7XG5cdFx0Y29uc3QgY2FsbGJhY2tGbiA9IGIgfHwgYTtcblx0XHRyZXR1cm4gdGhpcy53YXRjaFByb3RlY3RlZChyZWN1cnNpdmUsIGNhbGxiYWNrRm4pO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0cHJvdGVjdGVkIHdhdGNoUHJvdGVjdGVkKFxuXHRcdHJlY3Vyc2l2ZTogYm9vbGVhbiwgXG5cdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKTogKCkgPT4gdm9pZFxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuYmFjay53YXRjaFByb3RlY3RlZChyZWN1cnNpdmUsIGNhbGxiYWNrRm4pO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0cmVuYW1lKG5ld05hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLnJlbmFtZShuZXdOYW1lKTsgfVxuXHRcblx0LyoqICovXG5cdGV4aXN0cygpOiBQcm9taXNlPGJvb2xlYW4+IHsgcmV0dXJuIHRoaXMuYmFjay5leGlzdHMoKTsgfVxuXHRcblx0LyoqICovXG5cdGdldFNpemUoKTogUHJvbWlzZTxudW1iZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5nZXRTaXplKCk7IH1cblx0XG5cdC8qKiAqL1xuXHRnZXRNb2RpZmllZFRpY2tzKCk6IFByb21pc2U8bnVtYmVyPiB7IHJldHVybiB0aGlzLmJhY2suZ2V0TW9kaWZpZWRUaWNrcygpOyB9XG5cdFxuXHQvKiogKi9cblx0Z2V0Q3JlYXRlZFRpY2tzKCk6IFByb21pc2U8bnVtYmVyPiB7IHJldHVybiB0aGlzLmJhY2suZ2V0Q3JlYXRlZFRpY2tzKCk7IH1cblx0XG5cdC8qKiAqL1xuXHRnZXRBY2Nlc3NlZFRpY2tzKCk6IFByb21pc2U8bnVtYmVyPiB7IHJldHVybiB0aGlzLmJhY2suZ2V0QWNjZXNzZWRUaWNrcygpOyB9XG5cdFxuXHQvKiogKi9cblx0aXNEaXJlY3RvcnkoKTogUHJvbWlzZTxib29sZWFuPiB7IHJldHVybiB0aGlzLmJhY2suaXNEaXJlY3RvcnkoKTsgfVxuXHRcblx0LyoqXG5cdCAqIEluIHRoZSBjYXNlIHdoZW4gdGhpcyBGaWxhIG9iamVjdCByZXByZXNlbnRzIGEgZmlsZSwgdGhpcyBtZXRob2QgcmV0dXJucyBhIFxuXHQgKiBGaWxhIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgdGhlIGRpcmVjdG9yeSB0aGF0IGNvbnRhaW5zIHNhaWQgZmlsZS5cblx0ICogXG5cdCAqIEluIHRoZSBjYXNlIHdoZW4gdGhpcyBGaWxhIG9iamVjdCByZXByZXNlbnRzIGEgZGlyZWN0b3J5LCB0aGlzIG1ldGhvZFxuXHQgKiByZXR1cm5zIHRoZSBjdXJyZW50IEZpbGEgb2JqZWN0IGFzLWlzLlxuXHQgKi9cblx0YXN5bmMgZ2V0RGlyZWN0b3J5KCk6IFByb21pc2U8RmlsYT5cblx0e1xuXHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcblx0XHRyZXR1cm4gbmV3IEZpbGEoLi4udGhpcy51cCgpLmNvbXBvbmVudHMpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogR2V0cyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgbmFtZSBvZiB0aGUgZmlsZSBzeXN0ZW0gb2JqZWN0IGJlaW5nXG5cdCAqIHJlcHJlc2VudGVkIGJ5IHRoaXMgRmlsYSBvYmplY3QuXG5cdCAqL1xuXHRnZXQgbmFtZSgpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5jb21wb25lbnRzLmF0KC0xKSB8fCBcIlwiO1xuXHR9XG5cdFxuXHQvKipcblx0ICogR2V0IHRoZSBmaWxlIGV4dGVuc2lvbiBvZiB0aGUgZmlsZSBiZWluZyByZXByZXNlbnRlZCBieSB0aGlzXG5cdCAqIEZpbGEgb2JqZWN0LCB3aXRoIHRoZSBcIi5cIiBjaGFyYWN0ZXIuXG5cdCAqL1xuXHRnZXQgZXh0ZW5zaW9uKClcblx0e1xuXHRcdGNvbnN0IG5hbWUgPSB0aGlzLm5hbWU7XG5cdFx0Y29uc3QgbGFzdERvdCA9IG5hbWUubGFzdEluZGV4T2YoXCIuXCIpO1xuXHRcdHJldHVybiBsYXN0RG90IDwgMCA/IFwiXCIgOiBuYW1lLnNsaWNlKGxhc3REb3QpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogR2V0cyB0aGUgZnVsbHktcXVhbGlmaWVkIHBhdGgsIGluY2x1ZGluZyBhbnkgZmlsZSBuYW1lIHRvIHRoZVxuXHQgKiBmaWxlIHN5c3RlbSBvYmplY3QgYmVpbmcgcmVwcmVzZW50ZWQgYnkgdGhpcyBGaWxhIG9iamVjdC5cblx0ICovXG5cdGdldCBwYXRoKClcblx0e1xuXHRcdHJldHVybiBGaWxhLnNlcCArIEZpbGEuam9pbiguLi50aGlzLmNvbXBvbmVudHMpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIEZpbGEgb2JqZWN0IHRoYXQgcmVwcmVzZW50cyB0aGUgZmlyc3Qgb3IgbnRoIGNvbnRhaW5pbmdcblx0ICogZGlyZWN0b3J5IG9mIHRoZSBvYmplY3QgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdCAqIFJldHVybnMgdGhlIHRoaXMgcmVmZXJlbmNlIGluIHRoZSBjYXNlIHdoZW4gdGhlIFxuXHQgKi9cblx0dXAoY291bnQgPSAxKVxuXHR7XG5cdFx0aWYgKHRoaXMuY29tcG9uZW50cy5sZW5ndGggPCAyKVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XG5cdFx0Y29uc3QgcGFyZW50Q29tcG9uZW50cyA9IHRoaXMuY29tcG9uZW50cy5zbGljZSgwLCAtY291bnQpO1xuXHRcdHJldHVybiBwYXJlbnRDb21wb25lbnRzLmxlbmd0aCA+IDAgP1xuXHRcdFx0bmV3IEZpbGEoLi4ucGFyZW50Q29tcG9uZW50cykgOlxuXHRcdFx0bmV3IEZpbGEoXCIvXCIpO1xuXHR9XG5cdFxuXHQvKipcblx0ICogU2VhcmNoZXMgdXB3YXJkIHRocm91Z2ggdGhlIGZpbGUgc3lzdGVtIGFuY2VzdHJ5IGZvciBhIG5lc3RlZCBmaWxlLlxuXHQgKi9cblx0YXN5bmMgdXBzY2FuKHJlbGF0aXZlRmlsZU5hbWU6IHN0cmluZylcblx0e1xuXHRcdGxldCBhbmNlc3RyeSA9IHRoaXMgYXMgRmlsYTtcblx0XHRcblx0XHRkb1xuXHRcdHtcblx0XHRcdGNvbnN0IG1heWJlID0gYW5jZXN0cnkuZG93bihyZWxhdGl2ZUZpbGVOYW1lKTtcblx0XHRcdGlmIChhd2FpdCBtYXliZS5leGlzdHMoKSlcblx0XHRcdFx0cmV0dXJuIG1heWJlO1xuXHRcdFx0XG5cdFx0XHRpZiAoYW5jZXN0cnkuY29tcG9uZW50cy5sZW5ndGggPT09IDEpXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRhbmNlc3RyeSA9IGFuY2VzdHJ5LnVwKCk7XG5cdFx0fVxuXHRcdHdoaWxlIChhbmNlc3RyeS5jb21wb25lbnRzLmxlbmd0aCA+IDApO1xuXHRcdFxuXHRcdHJldHVybiBudWxsIGFzIGFueSBhcyBGaWxhIHwgbnVsbDtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgYSBGaWxhIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgYSBmaWxlIG9yIGRpcmVjdG9yeSBuZXN0ZWRcblx0ICogd2l0aGluIHRoZSBjdXJyZW50IEZpbGEgb2JqZWN0ICh3aGljaCBtdXN0IGJlIGEgZGlyZWN0b3J5KS5cblx0ICovXG5cdGRvd24oLi4uYWRkaXRpb25hbENvbXBvbmVudHM6IHN0cmluZ1tdKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyBGaWxhKC4uLnRoaXMuY29tcG9uZW50cywgLi4uYWRkaXRpb25hbENvbXBvbmVudHMpO1xuXHR9XG59XG5cbm5hbWVzcGFjZSBGaWxhXG57XG5cdC8qKiAqL1xuXHRleHBvcnQgaW50ZXJmYWNlIElXcml0ZVRleHRPcHRpb25zXG5cdHtcblx0XHRyZWFkb25seSBhcHBlbmQ6IGJvb2xlYW47XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZnVuY3Rpb24gam9pbiguLi5hcmdzOiBzdHJpbmdbXSlcblx0e1xuXHRcdGlmIChhcmdzLmxlbmd0aCA9PT0gMClcblx0XHRcdHJldHVybiBcIi5cIjtcblx0XHRcblx0XHRsZXQgam9pbmVkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cdFx0XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgKytpKVxuXHRcdHtcblx0XHRcdGxldCBhcmcgPSBhcmdzW2ldO1xuXHRcdFx0XG5cdFx0XHRpZiAoYXJnLmxlbmd0aCA+IDApXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChqb2luZWQgPT09IHVuZGVmaW5lZClcblx0XHRcdFx0XHRqb2luZWQgPSBhcmc7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRqb2luZWQgKz0gXCIvXCIgKyBhcmc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdGlmIChqb2luZWQgPT09IHVuZGVmaW5lZClcblx0XHRcdHJldHVybiBcIi5cIjtcblx0XHRcblx0XHRyZXR1cm4gbm9ybWFsaXplKGpvaW5lZCk7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplKHBhdGg6IHN0cmluZylcblx0e1xuXHRcdGlmIChwYXRoLmxlbmd0aCA9PT0gMClcblx0XHRcdHJldHVybiBcIi5cIjtcblx0XHRcblx0XHRjb25zdCBpc0Fic29sdXRlID0gcGF0aC5jaGFyQ29kZUF0KDApID09PSBDaGFyLnNsYXNoO1xuXHRcdGNvbnN0IHRyYWlsaW5nU2VwYXJhdG9yID0gcGF0aC5jaGFyQ29kZUF0KHBhdGgubGVuZ3RoIC0gMSkgPT09IENoYXIuc2xhc2g7XG5cdFx0XG5cdFx0Ly8gTm9ybWFsaXplIHRoZSBwYXRoXG5cdFx0cGF0aCA9IG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHBhdGgsICFpc0Fic29sdXRlKTtcblx0XHRcblx0XHRpZiAocGF0aC5sZW5ndGggPT09IDAgJiYgIWlzQWJzb2x1dGUpXG5cdFx0XHRwYXRoID0gXCIuXCI7XG5cdFx0XG5cdFx0aWYgKHBhdGgubGVuZ3RoID4gMCAmJiB0cmFpbGluZ1NlcGFyYXRvcilcblx0XHRcdHBhdGggKz0gRmlsYS5zZXA7XG5cdFx0XG5cdFx0aWYgKGlzQWJzb2x1dGUpXG5cdFx0XHRyZXR1cm4gRmlsYS5zZXAgKyBwYXRoO1xuXHRcdFxuXHRcdHJldHVybiBwYXRoO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZnVuY3Rpb24gbm9ybWFsaXplU3RyaW5nUG9zaXgocGF0aDogc3RyaW5nLCBhbGxvd0Fib3ZlUm9vdDogYm9vbGVhbilcblx0e1xuXHRcdGxldCByZXMgPSBcIlwiO1xuXHRcdGxldCBsYXN0U2VnbWVudExlbmd0aCA9IDA7XG5cdFx0bGV0IGxhc3RTbGFzaCA9IC0xO1xuXHRcdGxldCBkb3RzID0gMDtcblx0XHRsZXQgY29kZTtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8PSBwYXRoLmxlbmd0aDsgKytpKVxuXHRcdHtcblx0XHRcdGlmIChpIDwgcGF0aC5sZW5ndGgpXG5cdFx0XHRcdGNvZGUgPSBwYXRoLmNoYXJDb2RlQXQoaSk7XG5cdFx0XHRcblx0XHRcdGVsc2UgaWYgKGNvZGUgPT09IENoYXIuc2xhc2gpXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGNvZGUgPSBDaGFyLnNsYXNoO1xuXHRcdFx0XG5cdFx0XHRpZiAoY29kZSA9PT0gQ2hhci5zbGFzaClcblx0XHRcdHtcblx0XHRcdFx0aWYgKGxhc3RTbGFzaCA9PT0gaSAtIDEgfHwgZG90cyA9PT0gMSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdC8vIE5PT1Bcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChsYXN0U2xhc2ggIT09IGkgLSAxICYmIGRvdHMgPT09IDIpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAocmVzLmxlbmd0aCA8IDIgfHwgXG5cdFx0XHRcdFx0XHRsYXN0U2VnbWVudExlbmd0aCAhPT0gMiB8fCBcblx0XHRcdFx0XHRcdHJlcy5jaGFyQ29kZUF0KHJlcy5sZW5ndGggLSAxKSAhPT0gQ2hhci5kb3QgfHxcblx0XHRcdFx0XHRcdHJlcy5jaGFyQ29kZUF0KHJlcy5sZW5ndGggLSAyKSAhPT0gQ2hhci5kb3QpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKHJlcy5sZW5ndGggPiAyKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRsZXQgbGFzdFNsYXNoSW5kZXggPSByZXMubGFzdEluZGV4T2YoRmlsYS5zZXApO1xuXHRcdFx0XHRcdFx0XHRpZiAobGFzdFNsYXNoSW5kZXggIT09IHJlcy5sZW5ndGggLSAxKVxuXHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGxhc3RTbGFzaEluZGV4ID09PSAtMSlcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXMgPSBcIlwiO1xuXHRcdFx0XHRcdFx0XHRcdFx0bGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzID0gcmVzLnNsaWNlKDAsIGxhc3RTbGFzaEluZGV4KTtcblx0XHRcdFx0XHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoID0gcmVzLmxlbmd0aCAtIDEgLSByZXMubGFzdEluZGV4T2YoRmlsYS5zZXApO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRsYXN0U2xhc2ggPSBpO1xuXHRcdFx0XHRcdFx0XHRcdGRvdHMgPSAwO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlbHNlIGlmIChyZXMubGVuZ3RoID09PSAyIHx8IHJlcy5sZW5ndGggPT09IDEpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHJlcyA9IFwiXCI7XG5cdFx0XHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoID0gMDtcblx0XHRcdFx0XHRcdFx0bGFzdFNsYXNoID0gaTtcblx0XHRcdFx0XHRcdFx0ZG90cyA9IDA7XG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoYWxsb3dBYm92ZVJvb3QpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKHJlcy5sZW5ndGggPiAwKVxuXHRcdFx0XHRcdFx0XHRyZXMgKz0gXCIvLi5cIjtcblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0cmVzID0gXCIuLlwiO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRsYXN0U2VnbWVudExlbmd0aCA9IDI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChyZXMubGVuZ3RoID4gMClcblx0XHRcdFx0XHRcdHJlcyArPSBGaWxhLnNlcCArIHBhdGguc2xpY2UobGFzdFNsYXNoICsgMSwgaSk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0cmVzID0gcGF0aC5zbGljZShsYXN0U2xhc2ggKyAxLCBpKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRsYXN0U2VnbWVudExlbmd0aCA9IGkgLSBsYXN0U2xhc2ggLSAxO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGxhc3RTbGFzaCA9IGk7XG5cdFx0XHRcdGRvdHMgPSAwO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAoY29kZSA9PT0gQ2hhci5kb3QgJiYgZG90cyAhPT0gLTEpXG5cdFx0XHR7XG5cdFx0XHRcdCsrZG90cztcblx0XHRcdH1cblx0XHRcdGVsc2UgZG90cyA9IC0xO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIHJlbGF0aXZlKGZyb206IHN0cmluZyB8IEZpbGEsIHRvOiBzdHJpbmcgfCBGaWxhKVxuXHR7XG5cdFx0aWYgKGZyb20gPT09IHRvKVxuXHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0XG5cdFx0ZnJvbSA9IHBvc2l4LnJlc29sdmUoZnJvbSBpbnN0YW5jZW9mIEZpbGEgPyBmcm9tLnBhdGggOiBmcm9tKTtcblx0XHR0byA9IHBvc2l4LnJlc29sdmUodG8gaW5zdGFuY2VvZiBGaWxhID8gdG8ucGF0aCA6IHRvKTtcblx0XHRcblx0XHRpZiAoZnJvbSA9PT0gdG8pXG5cdFx0XHRyZXR1cm4gXCJcIjtcblx0XHRcblx0XHQvLyBUcmltIGFueSBsZWFkaW5nIGJhY2tzbGFzaGVzXG5cdFx0dmFyIGZyb21TdGFydCA9IDE7XG5cdFx0Zm9yICg7IGZyb21TdGFydCA8IGZyb20ubGVuZ3RoOyArK2Zyb21TdGFydCkgXG5cdFx0XHRpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCkgIT09IDQ3IC8qLyovKVxuXHRcdFx0XHRicmVhaztcblx0XHRcblx0XHR2YXIgZnJvbUVuZCA9IGZyb20ubGVuZ3RoO1xuXHRcdHZhciBmcm9tTGVuID0gZnJvbUVuZCAtIGZyb21TdGFydDtcblx0XHRcblx0XHQvLyBUcmltIGFueSBsZWFkaW5nIGJhY2tzbGFzaGVzXG5cdFx0dmFyIHRvU3RhcnQgPSAxO1xuXHRcdGZvciAoOyB0b1N0YXJ0IDwgdG8ubGVuZ3RoOyArK3RvU3RhcnQpXG5cdFx0XHRpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0KSAhPT0gNDcgLyovKi8pXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFxuXHRcdHZhciB0b0VuZCA9IHRvLmxlbmd0aDtcblx0XHR2YXIgdG9MZW4gPSB0b0VuZCAtIHRvU3RhcnQ7XG5cdFx0XG5cdFx0Ly8gQ29tcGFyZSBwYXRocyB0byBmaW5kIHRoZSBsb25nZXN0IGNvbW1vbiBwYXRoIGZyb20gcm9vdFxuXHRcdHZhciBsZW5ndGggPSBmcm9tTGVuIDwgdG9MZW4gPyBmcm9tTGVuIDogdG9MZW47XG5cdFx0dmFyIGxhc3RDb21tb25TZXAgPSAtMTtcblx0XHR2YXIgaSA9IDA7XG5cdFx0Zm9yICg7IGkgPD0gbGVuZ3RoOyArK2kpXG5cdFx0e1xuXHRcdFx0aWYgKGkgPT09IGxlbmd0aClcblx0XHRcdHtcblx0XHRcdFx0aWYgKHRvTGVuID4gbGVuZ3RoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCArIGkpID09PSA0NyAvKi8qLyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Ly8gV2UgZ2V0IGhlcmUgaWYgYGZyb21gIGlzIHRoZSBleGFjdCBiYXNlIHBhdGggZm9yIGB0b2AuXG5cdFx0XHRcdFx0XHQvLyBGb3IgZXhhbXBsZTogZnJvbT1cIi9mb28vYmFyXCI7IHRvPVwiL2Zvby9iYXIvYmF6XCJcblx0XHRcdFx0XHRcdHJldHVybiB0by5zbGljZSh0b1N0YXJ0ICsgaSArIDEpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChpID09PSAwKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgcm9vdFxuXHRcdFx0XHRcdFx0Ly8gRm9yIGV4YW1wbGU6IGZyb209XCIvXCI7IHRvPVwiL2Zvb1wiXG5cdFx0XHRcdFx0XHRyZXR1cm4gdG8uc2xpY2UodG9TdGFydCArIGkpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlIGlmIChmcm9tTGVuID4gbGVuZ3RoKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKSA9PT0gNDcgLyovKi8gKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdC8vIFdlIGdldCBoZXJlIGlmIGB0b2AgaXMgdGhlIGV4YWN0IGJhc2UgcGF0aCBmb3IgYGZyb21gLlxuXHRcdFx0XHRcdFx0Ly8gRm9yIGV4YW1wbGU6IGZyb209XCIvZm9vL2Jhci9iYXpcIjsgdG89XCIvZm9vL2JhclwiXG5cdFx0XHRcdFx0XHRsYXN0Q29tbW9uU2VwID0gaTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoaSA9PT0gMClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSByb290LlxuXHRcdFx0XHRcdFx0Ly8gRm9yIGV4YW1wbGU6IGZyb209XCIvZm9vXCI7IHRvPVwiL1wiXG5cdFx0XHRcdFx0XHRsYXN0Q29tbW9uU2VwID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHZhciBmcm9tQ29kZSA9IGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQgKyBpKTtcblx0XHRcdHZhciB0b0NvZGUgPSB0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKTtcblx0XHRcdFxuXHRcdFx0aWYgKGZyb21Db2RlICE9PSB0b0NvZGUpXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0XG5cdFx0XHRlbHNlIGlmIChmcm9tQ29kZSA9PT0gNDcgLyovKi8gKVxuXHRcdFx0XHRsYXN0Q29tbW9uU2VwID0gaTtcblx0XHR9XG5cdFx0XG5cdFx0dmFyIG91dCA9IFwiXCI7XG5cdFx0Ly8gR2VuZXJhdGUgdGhlIHJlbGF0aXZlIHBhdGggYmFzZWQgb24gdGhlIHBhdGggZGlmZmVyZW5jZSBiZXR3ZWVuIGB0b2Bcblx0XHQvLyBhbmQgYGZyb21gXG5cdFx0Zm9yIChpID0gZnJvbVN0YXJ0ICsgbGFzdENvbW1vblNlcCArIDE7IGkgPD0gZnJvbUVuZDsgKytpKVxuXHRcdHtcblx0XHRcdGlmIChpID09PSBmcm9tRW5kIHx8IGZyb20uY2hhckNvZGVBdChpKSA9PT0gNDcgLyovKi8gKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAob3V0Lmxlbmd0aCA9PT0gMClcblx0XHRcdFx0XHRvdXQgKz0gXCIuLlwiO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0b3V0ICs9IFwiLy4uXCI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8vIExhc3RseSwgYXBwZW5kIHRoZSByZXN0IG9mIHRoZSBkZXN0aW5hdGlvbiAoYHRvYCkgcGF0aCB0aGF0IGNvbWVzIGFmdGVyXG5cdFx0Ly8gdGhlIGNvbW1vbiBwYXRoIHBhcnRzXG5cdFx0aWYgKG91dC5sZW5ndGggPiAwKVxuXHRcdFx0cmV0dXJuIG91dCArIHRvLnNsaWNlKHRvU3RhcnQgKyBsYXN0Q29tbW9uU2VwKTtcblx0XHRcblx0XHR0b1N0YXJ0ICs9IGxhc3RDb21tb25TZXA7XG5cdFx0aWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCkgPT09IDQ3IC8qLyovIClcblx0XHRcdCsrdG9TdGFydDtcblx0XHRcblx0XHRyZXR1cm4gdG8uc2xpY2UodG9TdGFydCk7XG5cdH1cblx0XG5cdGNvbnN0IHBvc2l4ID0ge1xuXHRcdHJlc29sdmUoLi4uYXJnczogc3RyaW5nW10pXG5cdFx0e1xuXHRcdFx0dmFyIHJlc29sdmVkUGF0aCA9IFwiXCI7XG5cdFx0XHR2YXIgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXHRcdFx0dmFyIGN3ZDtcblx0XHRcdFxuXHRcdFx0Zm9yICh2YXIgaSA9IGFyZ3MubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKVxuXHRcdFx0e1xuXHRcdFx0XHR2YXIgcGF0aDtcblx0XHRcdFx0aWYgKGkgPj0gMClcblx0XHRcdFx0XHRwYXRoID0gYXJnc1tpXTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGN3ZCA9PT0gdW5kZWZpbmVkICYmIHR5cGVvZiBwcm9jZXNzID09PSBcIm9iamVjdFwiKVxuXHRcdFx0XHRcdFx0Y3dkID0gcHJvY2Vzcy5jd2QoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRwYXRoID0gY3dkO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHQvLyBTa2lwIGVtcHR5IGVudHJpZXNcblx0XHRcdFx0aWYgKHBhdGgubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcblx0XHRcdFx0cmVzb2x2ZWRQYXRoID0gcGF0aCArIFwiL1wiICsgcmVzb2x2ZWRQYXRoO1xuXHRcdFx0XHRyZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQ29kZUF0KDApID09PSA0NyAvKi8qLztcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Ly8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuXHRcdFx0Ly8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cdFx0XHRcblx0XHRcdC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuXHRcdFx0cmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplU3RyaW5nUG9zaXgocmVzb2x2ZWRQYXRoLCAhcmVzb2x2ZWRBYnNvbHV0ZSk7XG5cdFx0XHRcblx0XHRcdGlmIChyZXNvbHZlZEFic29sdXRlKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAocmVzb2x2ZWRQYXRoLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0cmV0dXJuIFwiL1wiICsgcmVzb2x2ZWRQYXRoO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0cmV0dXJuIFwiL1wiO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAocmVzb2x2ZWRQYXRoLmxlbmd0aCA+IDApXG5cdFx0XHRcdHJldHVybiByZXNvbHZlZFBhdGg7XG5cdFx0XHRcblx0XHRcdHJldHVybiBcIi5cIjtcblx0XHR9LFxuXHR9O1xuXHRcblx0ZGVjbGFyZSBjb25zdCBwcm9jZXNzOiBhbnk7XG5cdFxuXHQvKiogKi9cblx0Y29uc3QgZW51bSBDaGFyXG5cdHtcblx0XHRkb3QgPSA0Nixcblx0XHRzbGFzaCA9IDQ3LFxuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGNvbnN0IGVudW0gRXZlbnRcblx0e1xuXHRcdGNyZWF0ZSA9IFwiY3JlYXRlXCIsXG5cdFx0bW9kaWZ5ID0gXCJtb2RpZnlcIixcblx0XHRkZWxldGUgPSBcImRlbGV0ZVwiLFxuXHR9XG59XG5cbi8vQHRzLWlnbm9yZSBDb21tb25KUyBjb21wYXRpYmlsaXR5XG50eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiICYmIE9iamVjdC5hc3NpZ24obW9kdWxlLmV4cG9ydHMsIHsgRmlsYSB9KTtcblxuLy8gQ29tbW9uSlMgbW9kdWxlIHR5cGluZ3NcbmRlY2xhcmUgbW9kdWxlIFwiQHNxdWFyZXNhcHAvZmlsYVwiXG57XG5cdGV4cG9ydCA9IEZpbGE7XG59XG4iLCJcbi8qKiBAaW50ZXJuYWwgKi9cbmRlY2xhcmUgY29uc3QgQ0FQQUNJVE9SOiBib29sZWFuO1xuXG4oKCkgPT5cbntcblx0aWYgKHR5cGVvZiBDQVBBQ0lUT1IgPT09IFwidW5kZWZpbmVkXCIpXG5cdE9iamVjdC5hc3NpZ24oZ2xvYmFsVGhpcywgeyBDQVBBQ0lUT1I6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mICh3aW5kb3cgYXMgYW55KS5DYXBhY2l0b3IgIT09IFwidW5kZWZpbmVkXCIgfSk7XG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKCFDQVBBQ0lUT1IpIHJldHVybjtcblx0XG5cdC8qKiAqL1xuXHRjbGFzcyBGaWxhQ2FwYWNpdG9yIGV4dGVuZHMgRmlsYS5GaWxhQmFja2VuZFxuXHR7XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBnZXQgZnMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGcgPSBnbG9iYWxUaGlzIGFzIGFueTtcblx0XHRcdGNvbnN0IGZzID0gZy5DYXBhY2l0b3I/LlBsdWdpbnM/LkZpbGVzeXN0ZW07XG5cdFx0XHRpZiAoIWZzKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJGaWxlc3lzdGVtIHBsdWdpbiBub3QgYWRkZWQgdG8gQ2FwYWNpdG9yLlwiKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZzIGFzIHR5cGVvZiBpbXBvcnQoXCJAY2FwYWNpdG9yL2ZpbGVzeXN0ZW1cIikuRmlsZXN5c3RlbTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogR2V0cyB0aGUgZnVsbHktcXVhbGlmaWVkIHBhdGgsIGluY2x1ZGluZyBhbnkgZmlsZSBuYW1lIHRvIHRoZVxuXHRcdCAqIGZpbGUgc3lzdGVtIG9iamVjdCBiZWluZyByZXByZXNlbnRlZCBieSB0aGlzIEZpbGEgb2JqZWN0LlxuXHRcdCAqL1xuXHRcdGdldCBwYXRoKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gRmlsYS5qb2luKC4uLnRoaXMuZmlsYS5jb21wb25lbnRzKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZFRleHQoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZnMucmVhZEZpbGUoe1xuXHRcdFx0XHQuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksXG5cdFx0XHRcdGVuY29kaW5nOiBcInV0ZjhcIiBhcyBhbnlcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcmVzdWx0LmRhdGEgYXMgc3RyaW5nO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkQmluYXJ5KClcblx0XHR7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmZzLnJlYWRGaWxlKHtcblx0XHRcdFx0Li4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLFxuXHRcdFx0XHRlbmNvZGluZzogXCJhc2NpaVwiIGFzIGFueVxuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdC8vIERvZXMgdGhpcyB3b3JrIG9uIGlPUz9cblx0XHRcdGNvbnN0IGJsb2IgPSByZXN1bHQuZGF0YSBhcyBCbG9iO1xuXHRcdFx0Y29uc3QgYnVmZmVyID0gYXdhaXQgbmV3IFJlc3BvbnNlKGJsb2IpLmFycmF5QnVmZmVyKCk7XG5cdFx0XHRyZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcblx0XHRcdFxuXHRcdFx0Ly9jb25zdCBiYXNlNjQgPSByZXN1bHQuZGF0YTtcblx0XHRcdC8vcmV0dXJuIFVpbnQ4QXJyYXkuZnJvbShhdG9iKGJhc2U2NCksIGMgPT4gYy5jaGFyQ29kZUF0KDApKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZERpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5mcy5yZWFkZGlyKHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSk7XG5cdFx0XHRjb25zdCBmaWxhczogRmlsYVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgZmlsZSBvZiByZXN1bHQuZmlsZXMpXG5cdFx0XHRcdGlmIChmaWxlLm5hbWUgIT09IFwiLkRTX1N0b3JlXCIpXG5cdFx0XHRcdFx0ZmlsYXMucHVzaChuZXcgRmlsYSh0aGlzLnBhdGgsIGZpbGUubmFtZSB8fCBcIlwiKSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBmaWxhcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVUZXh0KHRleHQ6IHN0cmluZywgb3B0aW9ucz86IEZpbGEuSVdyaXRlVGV4dE9wdGlvbnMpXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHVwID0gdGhpcy5maWxhLnVwKCk7XG5cdFx0XHRcdGlmICghYXdhaXQgdXAuZXhpc3RzKCkpXG5cdFx0XHRcdFx0YXdhaXQgdXAud3JpdGVEaXJlY3RvcnkoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGNvbnN0IHdyaXRlT3B0aW9ucyA9IHtcblx0XHRcdFx0XHQuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksXG5cdFx0XHRcdFx0ZGF0YTogdGV4dCxcblx0XHRcdFx0XHRlbmNvZGluZzogXCJ1dGY4XCIgYXMgYW55XG5cdFx0XHRcdH07XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAob3B0aW9ucz8uYXBwZW5kKVxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuZnMuYXBwZW5kRmlsZSh3cml0ZU9wdGlvbnMpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5mcy53cml0ZUZpbGUod3JpdGVPcHRpb25zKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiV3JpdGUgZmFpbGVkIHRvIHBhdGg6IFwiICsgdGhpcy5wYXRoKTtcblx0XHRcdFx0ZGVidWdnZXI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlQmluYXJ5KGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcilcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLmZpbGEudXAoKS53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuYXJyYXlCdWZmZXJUb0Jhc2U2NChhcnJheUJ1ZmZlcik7XG5cdFx0XHRhd2FpdCB0aGlzLmZzLndyaXRlRmlsZSh7XG5cdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0ZGF0YSxcblx0XHRcdFx0ZW5jb2Rpbmc6IFwiYXNjaWlcIiBhcyBhbnlcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGFycmF5QnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcilcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPihyID0+XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbYnVmZmVyXSwgeyB0eXBlOiBcImFwcGxpY2F0aW9uL29jdGV0LWJpbmFyeVwiIH0pO1xuXHRcdFx0XHRjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXHRcdFx0XHRcblx0XHRcdFx0cmVhZGVyLm9ubG9hZCA9IGV2ID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBkYXRhVXJsID0gKGV2LnRhcmdldD8ucmVzdWx0IHx8IFwiXCIpIGFzIHN0cmluZztcblx0XHRcdFx0XHRjb25zdCBzbGljZSA9IGRhdGFVcmwuc2xpY2UoZGF0YVVybC5pbmRleE9mKGAsYCkgKyAxKTtcblx0XHRcdFx0XHRyKHNsaWNlKTtcblx0XHRcdFx0fTtcblx0XHRcdFx0cmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYik7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZnMubWtkaXIoe1xuXHRcdFx0XHQuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksXG5cdFx0XHRcdHJlY3Vyc2l2ZTogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFdyaXRlcyBhIHN5bWxpbmsgZmlsZSBhdCB0aGUgbG9jYXRpb24gcmVwcmVzZW50ZWQgYnkgdGhlIHNwZWNpZmllZFxuXHRcdCAqIEZpbGEgb2JqZWN0LCB0byB0aGUgbG9jYXRpb24gc3BlY2lmaWVkIGJ5IHRoZSBjdXJyZW50IEZpbGEgb2JqZWN0LlxuXHRcdCAqL1xuXHRcdGFzeW5jIHdyaXRlU3ltbGluayhhdDogRmlsYSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWRcIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIERlbGV0ZXMgdGhlIGZpbGUgb3IgZGlyZWN0b3J5IHRoYXQgdGhpcyBGaWxhIG9iamVjdCByZXByZXNlbnRzLlxuXHRcdCAqL1xuXHRcdGFzeW5jIGRlbGV0ZSgpOiBQcm9taXNlPEVycm9yIHwgdm9pZD5cblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8RXJyb3IgfCB2b2lkPihhc3luYyByID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmZzLnJtZGlyKHtcblx0XHRcdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0XHRcdHJlY3Vyc2l2ZTogdHJ1ZVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHIoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMuZGVsZXRlRmlsZSh0aGlzLmdldERlZmF1bHRPcHRpb25zKCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBtb3ZlKHRhcmdldDogRmlsYSlcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBjb3B5KHRhcmdldDogRmlsYSlcblx0XHR7XG5cdFx0XHRjb25zdCBmcm9tT3B0aW9ucyA9IHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKTtcblx0XHRcdGNvbnN0IHRvT3B0aW9ucyA9IHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnModGFyZ2V0LnBhdGgpO1xuXHRcdFx0XG5cdFx0XHRhd2FpdCB0aGlzLmZzLmNvcHkoe1xuXHRcdFx0XHRmcm9tOiBmcm9tT3B0aW9ucy5wYXRoLFxuXHRcdFx0XHRkaXJlY3Rvcnk6IGZyb21PcHRpb25zLmRpcmVjdG9yeSxcblx0XHRcdFx0dG86IHRvT3B0aW9ucy5wYXRoLFxuXHRcdFx0XHR0b0RpcmVjdG9yeTogdG9PcHRpb25zLmRpcmVjdG9yeSxcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZW5hbWUobmV3TmFtZTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdGNvbnN0IHRhcmdldCA9IHRoaXMuZmlsYS51cCgpLmRvd24obmV3TmFtZSkucGF0aDtcblx0XHRcdGNvbnN0IGZyb21PcHRpb25zID0gdGhpcy5nZXREZWZhdWx0T3B0aW9ucygpO1xuXHRcdFx0Y29uc3QgdG9PcHRpb25zID0gdGhpcy5nZXREZWZhdWx0T3B0aW9ucyh0YXJnZXQpO1xuXHRcdFx0XG5cdFx0XHRhd2FpdCB0aGlzLmZzLnJlbmFtZSh7XG5cdFx0XHRcdGZyb206IHRoaXMucGF0aCxcblx0XHRcdFx0ZGlyZWN0b3J5OiBmcm9tT3B0aW9ucy5kaXJlY3RvcnksXG5cdFx0XHRcdHRvOiB0YXJnZXQsXG5cdFx0XHRcdHRvRGlyZWN0b3J5OiB0b09wdGlvbnMuZGlyZWN0b3J5XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0d2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sXG5cdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpOiAoKSA9PiB2b2lkXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiAhIWF3YWl0IHRoaXMuZ2V0U3RhdCgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRTaXplKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0U3RhdCgpKT8uc2l6ZSB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRNb2RpZmllZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0U3RhdCgpKT8ubXRpbWUgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0Q3JlYXRlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0U3RhdCgpKT8uY3RpbWUgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGlzRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0U3RhdCgpKT8udHlwZSA9PT0gXCJkaXJlY3RvcnlcIjtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBhc3luYyBnZXRTdGF0KClcblx0XHR7XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuZnMuc3RhdCh0aGlzLmdldERlZmF1bHRPcHRpb25zKCkpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpIHsgcmV0dXJuIG51bGw7IH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBnZXREZWZhdWx0T3B0aW9ucyh0YXJnZXRQYXRoOiBzdHJpbmcgPSB0aGlzLnBhdGgpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc2xhc2ggPSB0YXJnZXRQYXRoLmluZGV4T2YoXCIvXCIpO1xuXHRcdFx0bGV0IHBhdGggPSBcIlwiO1xuXHRcdFx0bGV0IGRpcmVjdG9yeSA9IFwiXCI7XG5cdFx0XHRcblx0XHRcdGlmIChzbGFzaCA8IDApXG5cdFx0XHR7XG5cdFx0XHRcdHBhdGggPSB0YXJnZXRQYXRoO1xuXHRcdFx0XHRkaXJlY3RvcnkgPSBEaXJlY3RvcnkuY2FjaGUgYXMgYW55IGFzIFREaXJlY3Rvcnk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHBhdGggPSB0YXJnZXRQYXRoLnNsaWNlKHNsYXNoICsgMSk7XG5cdFx0XHRcdGRpcmVjdG9yeSA9IHRhcmdldFBhdGguc2xpY2UoMCwgc2xhc2gpIGFzIFREaXJlY3Rvcnk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHtcblx0XHRcdFx0cGF0aCxcblx0XHRcdFx0ZGlyZWN0b3J5OiBkaXJlY3RvcnkgYXMgVERpcmVjdG9yeVxuXHRcdFx0fTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH1cblx0XG5cdFxuXHQvKiogKi9cblx0Y29uc3QgZW51bSBEaXJlY3Rvcnlcblx0e1xuXHRcdGNhY2hlID0gXCJDQUNIRVwiLFxuXHRcdGRhdGEgPSBcIkRBVEFcIixcblx0XHRkb2N1bWVudHMgPSBcIkRPQ1VNRU5UU1wiLFxuXHRcdGV4dGVybmFsID0gXCJFWFRFUk5BTFwiLFxuXHRcdGV4dGVybmFsU3RvcmFnZSA9IFwiRVhURVJOQUxfU1RPUkFHRVwiLFxuXHRcdGxpYnJhcnkgPSBcIkxJQlJBUllcIixcblx0fVxuXHRcblx0LyoqICovXG5cdHR5cGUgVERpcmVjdG9yeSA9IGltcG9ydChcIkBjYXBhY2l0b3IvZmlsZXN5c3RlbVwiKS5EaXJlY3Rvcnk7XG5cdFxuXHRjb25zdCBjd2QgPSBcIkRBVEFcIjtcblx0Y29uc3QgdG1wID0gXCJDQUNIRVwiO1xuXHRjb25zdCBzZXAgPSBcIi9cIjtcblx0RmlsYS5zZXR1cChGaWxhQ2FwYWNpdG9yLCBzZXAsIGN3ZCwgdG1wKTtcbn0pKCk7IiwiXG5uYW1lc3BhY2UgQ292ZXJcbntcblx0LyoqICovXG5cdGV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb3ZlckZpbGFOb2RlKClcblx0e1xuXHRcdGNvbnN0IGZpbGEgPSBuZXcgRmlsYShwcm9jZXNzLmN3ZCgpLCBcIkZpbGFOb2RlXCIsIFwiK3NhbXBsZVwiKTtcblx0XHRjb25zdCB4ID0gZmlsYS5kb3duKFwieFwiKTtcblx0XHRhd2FpdCBmaWxhLmlzRGlyZWN0b3J5KCk7XG5cdFx0XG5cdFx0ZmlsYS53YXRjaCgoZXYsIGZpbGEpID0+XG5cdFx0e1xuXHRcdFx0Y29uc29sZS5sb2coZXYgKyBcIjogXCIgKyBmaWxhLnBhdGgpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHByb2Nlc3Muc3RkaW4ucmVzdW1lKCk7XG5cdH1cbn1cblxudHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiBPYmplY3QuYXNzaWduKG1vZHVsZS5leHBvcnRzLCB7IENvdmVyIH0pO1xuIiwiXG4vKiogQGludGVybmFsICovXG5kZWNsYXJlIGNvbnN0IE5PREU6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIE5PREUgPT09IFwidW5kZWZpbmVkXCIpXG5cdFx0T2JqZWN0LmFzc2lnbihnbG9iYWxUaGlzLCB7IE5PREU6IHR5cGVvZiBwcm9jZXNzICsgdHlwZW9mIHJlcXVpcmUgPT09IFwib2JqZWN0ZnVuY3Rpb25cIiB9KTtcblx0XG5cdC8vQHRzLWlnbm9yZVxuXHRpZiAoIU5PREUpIHJldHVybjtcblx0XG5cdGNsYXNzIEZpbGFOb2RlIGV4dGVuZHMgRmlsYS5GaWxhQmFja2VuZFxuXHR7XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSByZWFkb25seSBmcyA9IHJlcXVpcmUoXCJmc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwiZnNcIik7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZFRleHQoKVxuXHRcdHtcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmZzLnByb21pc2VzLnJlYWRGaWxlKHRoaXMuZmlsYS5wYXRoLCBcInV0ZjhcIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWRCaW5hcnkoKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj5cblx0XHR7XG5cdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5mcy5wcm9taXNlcy5yZWFkRmlsZSh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWREaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZpbGVOYW1lcyA9IGF3YWl0IHRoaXMuZnMucHJvbWlzZXMucmVhZGRpcih0aGlzLmZpbGEucGF0aCk7XG5cdFx0XHRjb25zdCBmaWxhczogRmlsYVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgZmlsZU5hbWUgb2YgZmlsZU5hbWVzKVxuXHRcdFx0XHRpZiAoZmlsZU5hbWUgIT09IFwiLkRTX1N0b3JlXCIpXG5cdFx0XHRcdFx0ZmlsYXMucHVzaChuZXcgRmlsYSguLi50aGlzLmZpbGEuY29tcG9uZW50cywgZmlsZU5hbWUpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZpbGFzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZVRleHQodGV4dDogc3RyaW5nLCBvcHRpb25zPzogRmlsYS5JV3JpdGVUZXh0T3B0aW9ucylcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLmZpbGEudXAoKS53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0XG5cdFx0XHRpZiAob3B0aW9ucz8uYXBwZW5kKVxuXHRcdFx0XHRhd2FpdCB0aGlzLmZzLnByb21pc2VzLmFwcGVuZEZpbGUodGhpcy5maWxhLnBhdGgsIHRleHQpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRhd2FpdCB0aGlzLmZzLnByb21pc2VzLndyaXRlRmlsZSh0aGlzLmZpbGEucGF0aCwgdGV4dCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlQmluYXJ5KGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcilcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLmZpbGEudXAoKS53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0Y29uc3QgYnVmZmVyID0gQnVmZmVyLmZyb20oYXJyYXlCdWZmZXIpO1xuXHRcdFx0YXdhaXQgdGhpcy5mcy5wcm9taXNlcy53cml0ZUZpbGUodGhpcy5maWxhLnBhdGgsIGJ1ZmZlcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRpZiAoIXRoaXMuZnMuZXhpc3RzU3luYyh0aGlzLmZpbGEucGF0aCkpXG5cdFx0XHRcdGF3YWl0IHRoaXMuZnMucHJvbWlzZXMubWtkaXIodGhpcy5maWxhLnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBXcml0ZXMgYSBzeW1saW5rIGZpbGUgYXQgdGhlIGxvY2F0aW9uIHJlcHJlc2VudGVkIGJ5IHRoZSBzcGVjaWZpZWRcblx0XHQgKiBGaWxhIG9iamVjdCwgdG8gdGhlIGxvY2F0aW9uIHNwZWNpZmllZCBieSB0aGUgY3VycmVudCBGaWxhIG9iamVjdC5cblx0XHQgKi9cblx0XHRhc3luYyB3cml0ZVN5bWxpbmsoYXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KHIgPT5cblx0XHRcdHtcblx0XHRcdFx0dGhpcy5mcy5zeW1saW5rKGF0LnBhdGgsIHRoaXMuZmlsYS5wYXRoLCAoKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cigpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBEZWxldGVzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSB0aGF0IHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cy5cblx0XHQgKi9cblx0XHRhc3luYyBkZWxldGUoKTogUHJvbWlzZTxFcnJvciB8IHZvaWQ+XG5cdFx0e1xuXHRcdFx0aWYgKGF3YWl0IHRoaXMuaXNEaXJlY3RvcnkoKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPEVycm9yIHwgdm9pZD4ocmVzb2x2ZSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5mcy5ybWRpcih0aGlzLmZpbGEucGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSwgZXJyb3IgPT5cblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRyZXNvbHZlKGVycm9yIHx8IHZvaWQgMCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRhd2FpdCB0aGlzLmZzLnByb21pc2VzLnVubGluayh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG1vdmUodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+XG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZnMucmVuYW1lKHRoaXMuZmlsYS5wYXRoLCB0YXJnZXQucGF0aCwgKCkgPT4gcmVzb2x2ZSgpKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRjb3B5KHRhcmdldDogRmlsYSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oYXN5bmMgcmVzb2x2ZSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5mcy5jcCh0aGlzLmZpbGEucGF0aCwgdGFyZ2V0LnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9LCAoKSA9PiByZXNvbHZlKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGRpciA9IHRhcmdldC51cCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmICghYXdhaXQgZGlyLmV4aXN0cygpKVxuXHRcdFx0XHRcdFx0YXdhaXQgbmV3IFByb21pc2UociA9PiB0aGlzLmZzLm1rZGlyKGRpci5wYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9LCByKSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0dGhpcy5mcy5jb3B5RmlsZSh0aGlzLmZpbGEucGF0aCwgdGFyZ2V0LnBhdGgsICgpID0+IHJlc29sdmUoKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR3YXRjaFByb3RlY3RlZChcblx0XHRcdHJlY3Vyc2l2ZTogYm9vbGVhbixcblx0XHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSwgc2Vjb25kYXJ5RmlsYT86IEZpbGEpID0+IHZvaWQpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgd2F0Y2hlciA9IEZpbGFOb2RlLmNob2tpZGFyLndhdGNoKHRoaXMuZmlsYS5wYXRoKTtcblx0XHRcdFxuXHRcdFx0d2F0Y2hlci5vbihcInJlYWR5XCIsICgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdHdhdGNoZXIub24oXCJhbGxcIiwgKGV2TmFtZSwgcGF0aCkgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChwYXRoLmVuZHNXaXRoKFwiLy5EU19TdG9yZVwiKSlcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRsZXQgZXY6IEZpbGEuRXZlbnQgfCB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGV2TmFtZSA9PT0gXCJhZGRcIilcblx0XHRcdFx0XHRcdGV2ID0gRmlsYS5FdmVudC5jcmVhdGU7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZXZOYW1lID09PSBcImNoYW5nZVwiKVxuXHRcdFx0XHRcdFx0ZXYgPSBGaWxhLkV2ZW50Lm1vZGlmeTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChldk5hbWUgPT09IFwidW5saW5rXCIpXG5cdFx0XHRcdFx0XHRldiA9IEZpbGEuRXZlbnQuZGVsZXRlO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChldilcblx0XHRcdFx0XHRcdGNhbGxiYWNrRm4oZXYsIG5ldyBGaWxhKHBhdGgpKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuICgpID0+IHsgd2F0Y2hlci5yZW1vdmVBbGxMaXN0ZW5lcnMoKSB9O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIHN0YXRpYyBnZXQgY2hva2lkYXIoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl9jaG9raWRhciB8fCAodGhpcy5fY2hva2lkYXIgPSByZXF1aXJlKFwiY2hva2lkYXJcIikpO1xuXHRcdH1cblx0XHRwcml2YXRlIHN0YXRpYyBfY2hva2lkYXI6IHR5cGVvZiBpbXBvcnQoXCJjaG9raWRhclwiKTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRyZW5hbWUobmV3TmFtZTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmZzLnByb21pc2VzLnJlbmFtZSh0aGlzLmZpbGEucGF0aCwgdGhpcy5maWxhLnVwKCkuZG93bihuZXdOYW1lKS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZXhpc3RzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8Ym9vbGVhbj4ociA9PlxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmZzLnN0YXQodGhpcy5maWxhLnBhdGgsIGVycm9yID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyKCFlcnJvcik7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXRzID0gYXdhaXQgdGhpcy5nZXRTdGF0cygpO1xuXHRcdFx0cmV0dXJuIHN0YXRzPy5zaXplIHx8IDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldE1vZGlmaWVkVGlja3MoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXRzID0gYXdhaXQgdGhpcy5nZXRTdGF0cygpO1xuXHRcdFx0cmV0dXJuIHN0YXRzPy5tdGltZU1zIHx8IDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldENyZWF0ZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFN0YXRzKCk7XG5cdFx0XHRyZXR1cm4gc3RhdHM/LmJpcnRodGltZU1zIHx8IDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldEFjY2Vzc2VkVGlja3MoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXRzID0gYXdhaXQgdGhpcy5nZXRTdGF0cygpO1xuXHRcdFx0cmV0dXJuIHN0YXRzPy5hdGltZU1zIHx8IDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGlzRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRjb25zdCBzdGF0cyA9IGF3YWl0IHRoaXMuZ2V0U3RhdHMoKTtcblx0XHRcdHJldHVybiBzdGF0cz8uaXNEaXJlY3RvcnkoKSB8fCBmYWxzZTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBhc3luYyBnZXRTdGF0cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPGltcG9ydChcImZzXCIpLlN0YXRzIHwgdW5kZWZpbmVkPihyID0+XG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZnMuc3RhdCh0aGlzLmZpbGEucGF0aCwgKGVycm9yLCBzdGF0cykgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHIoc3RhdHMpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXHRcblx0Y29uc3Qgc2VwID0gKHJlcXVpcmUoXCJwYXRoXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJwYXRoXCIpKS5zZXA7XG5cdGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5cdGNvbnN0IHRtcCA9IChyZXF1aXJlKFwib3NcIikgYXMgdHlwZW9mIGltcG9ydChcIm9zXCIpKS50bXBkaXIoKTtcblx0RmlsYS5zZXR1cChGaWxhTm9kZSwgc2VwLCBjd2QsIHRtcCk7XG59KSgpO1xuIiwiXG4vKiogQGludGVybmFsICovXG5kZWNsYXJlIGNvbnN0IFRBVVJJOiBib29sZWFuO1xuXG4oKCkgPT5cbntcblx0aWYgKHR5cGVvZiBUQVVSSSA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRPYmplY3QuYXNzaWduKGdsb2JhbFRoaXMsIHsgVEFVUkk6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIChnbG9iYWxUaGlzIGFzIGFueSkuX19UQVVSSV9fICE9PSBcInVuZGVmaW5lZFwiIH0pO1xuXHRcblx0Ly9AdHMtaWdub3JlXG5cdGlmICghVEFVUkkpIHJldHVybjtcblx0XG5cdGNsYXNzIEZpbGFUYXVyaSBleHRlbmRzIEZpbGEuRmlsYUJhY2tlbmRcblx0e1xuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgcmVhZG9ubHkgZnM6IHR5cGVvZiBpbXBvcnQoXCJAdGF1cmktYXBwcy9hcGlcIikuZnMgPSBcblx0XHRcdChnbG9iYWxUaGlzIGFzIGFueSkuX19UQVVSSV9fLmZzO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlYWRUZXh0KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5mcy5yZWFkVGV4dEZpbGUodGhpcy5maWxhLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWFkQmluYXJ5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5mcy5yZWFkQmluYXJ5RmlsZSh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWREaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZpbGVOYW1lcyA9IGF3YWl0IHRoaXMuZnMucmVhZERpcih0aGlzLmZpbGEucGF0aCk7XG5cdFx0XHRjb25zdCBmaWxhczogRmlsYVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3QgZmlsZU5hbWUgb2YgZmlsZU5hbWVzKVxuXHRcdFx0XHRpZiAoZmlsZU5hbWUubmFtZSAhPT0gXCIuRFNfU3RvcmVcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKHRoaXMuZmlsYS5wYXRoLCBmaWxlTmFtZS5uYW1lIHx8IFwiXCIpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZpbGFzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZVRleHQodGV4dDogc3RyaW5nLCBvcHRpb25zPzogRmlsYS5JV3JpdGVUZXh0T3B0aW9ucylcblx0XHR7XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdXAgPSB0aGlzLmZpbGEudXAoKTtcblx0XHRcdFx0aWYgKCFhd2FpdCB1cC5leGlzdHMoKSlcblx0XHRcdFx0XHRhd2FpdCB1cC53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0YXdhaXQgdGhpcy5mcy53cml0ZVRleHRGaWxlKHRoaXMuZmlsYS5wYXRoLCB0ZXh0LCB7XG5cdFx0XHRcdFx0YXBwZW5kOiBvcHRpb25zPy5hcHBlbmRcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSlcblx0XHRcdHtcblx0XHRcdFx0ZGVidWdnZXI7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlQmluYXJ5KGFycmF5QnVmZmVyOiBBcnJheUJ1ZmZlcilcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLmZpbGEudXAoKS53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0YXdhaXQgdGhpcy5mcy53cml0ZUJpbmFyeUZpbGUodGhpcy5maWxhLnBhdGgsIGFycmF5QnVmZmVyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdHRoaXMuZnMuY3JlYXRlRGlyKHRoaXMuZmlsYS5wYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdFx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0YXN5bmMgd3JpdGVTeW1saW5rKGF0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHJldHVybiBudWxsIGFzIGFueTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdFx0ICovXG5cdFx0YXN5bmMgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPlxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxFcnJvciB8IHZvaWQ+KGFzeW5jIHJlc29sdmUgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGF3YWl0IHRoaXMuZnMucmVtb3ZlRGlyKHRoaXMuZmlsYS5wYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblx0XHRcdFx0XHRyZXNvbHZlKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRhd2FpdCB0aGlzLmZzLnJlbW92ZUZpbGUodGhpcy5maWxhLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRtb3ZlKHRhcmdldDogRmlsYSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbnVsbCBhcyBhbnk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGNvcHkodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0YXJnZXQuZXhpc3RzKCkpXG5cdFx0XHRcdGlmIChhd2FpdCB0YXJnZXQuaXNEaXJlY3RvcnkoKSlcblx0XHRcdFx0XHR0aHJvdyBcIkNvcHlpbmcgZGlyZWN0b3JpZXMgaXMgbm90IGltcGxlbWVudGVkLlwiO1xuXHRcdFx0XG5cdFx0XHRhd2FpdCB0aGlzLmZzLmNvcHlGaWxlKHRoaXMuZmlsYS5wYXRoLCB0YXJnZXQucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHdhdGNoUHJvdGVjdGVkKFxuXHRcdFx0cmVjdXJzaXZlOiBib29sZWFuLFxuXHRcdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdGxldCB1bjogRnVuY3Rpb24gfCBudWxsID0gbnVsbDtcblx0XHRcdFxuXHRcdFx0KGFzeW5jICgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdHVuID0gYXdhaXQgd2F0Y2hJbnRlcm5hbCh0aGlzLmZpbGEucGF0aCwge30sIGFzeW5jIGV2ID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoIXVuKVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IHBheWxvYWQgPSBldi5wYXlsb2FkLnBheWxvYWQ7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBwYXlsb2FkICE9PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGZpbGEgPSBuZXcgRmlsYShldi5wYXlsb2FkLnBheWxvYWQpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChldi50eXBlID09PSBcIk5vdGljZVdyaXRlXCIgfHwgZXYudHlwZSA9PT0gXCJXcml0ZVwiKVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tGbihGaWxhLkV2ZW50Lm1vZGlmeSwgZmlsYSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZXYudHlwZSA9PT0gXCJOb3RpY2VSZW1vdmVcIiB8fCBldi50eXBlID09PSBcIlJlbW92ZVwiKVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tGbihGaWxhLkV2ZW50LmRlbGV0ZSwgZmlsYSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZXYudHlwZSA9PT0gXCJDcmVhdGVcIiB8fCBldi50eXBlID09PSBcIlJlbmFtZVwiKVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tGbihGaWxhLkV2ZW50Lm1vZGlmeSwgZmlsYSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuICgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdC8vIFRoaXMgaXMgaGFja3kuLi4gdGhlIGludGVyZmFjZSBleHBlY3RzIGEgZnVuY3Rpb24gdG8gYmVcblx0XHRcdFx0Ly8gcmV0dXJuZWQgcmF0aGVyIHRoYW4gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gb25lLFxuXHRcdFx0XHQvLyBzbyB0aGlzIHdhaXRzIDEwMG1zIHRvIGNhbGwgdGhlIHVuKCkgZnVuY3Rpb24gaWYgdGhpcyB1bndhdGNoXG5cdFx0XHRcdC8vIGZ1bmN0aW9uIGlzIGludm9rZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgY2FsbGluZyB3YXRjaCgpLlxuXHRcdFx0XHRpZiAodW4pXG5cdFx0XHRcdFx0dW4oKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdW4/LigpLCAxMDApO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVuYW1lKG5ld05hbWU6IHN0cmluZylcblx0XHR7XG5cdFx0XHQvLyBOb3RlIHRoYXQgdGhlIFwicmVuYW1lRmlsZVwiIG1ldGhvZCBhY3R1YWxseSB3b3JrcyBvbiBkaXJlY3Rvcmllc1xuXHRcdFx0cmV0dXJuIHRoaXMuZnMucmVuYW1lRmlsZSh0aGlzLmZpbGEucGF0aCwgdGhpcy5maWxhLnVwKCkuZG93bihuZXdOYW1lKS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZXhpc3RzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5mcy5leGlzdHModGhpcy5maWxhLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRTaXplKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0TWV0YSgpKS5zaXplO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRNb2RpZmllZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0TWV0YSgpKS5tb2RpZmllZEF0O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRDcmVhdGVkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRNZXRhKCkpLmNyZWF0ZWRBdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldE1ldGEoKSkuYWNjZXNzZWRBdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgaXNEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRNZXRhKCkpLmlzRGlyO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGFzeW5jIGdldE1ldGEoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl9tZXRhIHx8ICh0aGlzLl9tZXRhID0gYXdhaXQgZ2V0TWV0YWRhdGEodGhpcy5maWxhLnBhdGgpKTtcblx0XHR9XG5cdFx0cHJpdmF0ZSBfbWV0YTogTWV0YWRhdGEgfCBudWxsID0gbnVsbDtcblx0fVxuXHRcblx0Y29uc3QgdCA9IChnbG9iYWxUaGlzIGFzIGFueSkuX19UQVVSSV9fO1xuXHRjb25zdCB0YXVyaTogdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS50YXVyaSA9IHQudGF1cmk7XG5cdGNvbnN0IHdpbmQ6IHR5cGVvZiBpbXBvcnQoXCJAdGF1cmktYXBwcy9hcGlcIikud2luZG93ID0gdC53aW5kb3c7XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRhc3luYyBmdW5jdGlvbiB1bndhdGNoKGlkOiBhbnkpXG5cdHtcblx0XHRhd2FpdCB0YXVyaS5pbnZva2UoJ3BsdWdpbjpmcy13YXRjaHx1bndhdGNoJywgeyBpZCB9KTtcblx0fVxuXG5cdC8qKiBAaW50ZXJuYWwgKi9cblx0YXN5bmMgZnVuY3Rpb24gd2F0Y2hJbnRlcm5hbChcblx0XHRwYXRoczogc3RyaW5nIHwgc3RyaW5nW10sXG5cdFx0b3B0aW9uczogRGVib3VuY2VkV2F0Y2hPcHRpb25zLFxuXHRcdGNhbGxiYWNrRm46IChldmVudDogVGF1cmlXYXRjaEV2ZW50KSA9PiB2b2lkKTogUHJvbWlzZTwoKSA9PiBQcm9taXNlPHZvaWQ+PlxuXHR7XG5cdFx0Y29uc3Qgb3B0cyA9IHtcblx0XHRcdHJlY3Vyc2l2ZTogZmFsc2UsXG5cdFx0XHRkZWxheU1zOiAyMDAwLFxuXHRcdFx0Li4ub3B0aW9ucyxcblx0XHR9O1xuXHRcdFxuXHRcdGxldCB3YXRjaFBhdGhzO1xuXHRcdGlmICh0eXBlb2YgcGF0aHMgPT09IFwic3RyaW5nXCIpXG5cdFx0XHR3YXRjaFBhdGhzID0gW3BhdGhzXTtcblx0XHRlbHNlXG5cdFx0XHR3YXRjaFBhdGhzID0gcGF0aHM7XG5cdFx0XG5cdFx0Y29uc3QgaWQgPSB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDMyQXJyYXkoMSkpWzBdO1xuXHRcdGF3YWl0IHRhdXJpLmludm9rZShcInBsdWdpbjpmcy13YXRjaHx3YXRjaFwiLCB7XG5cdFx0XHRpZCxcblx0XHRcdHBhdGhzOiB3YXRjaFBhdGhzLFxuXHRcdFx0b3B0aW9uczogb3B0cyxcblx0XHR9KTtcblx0XHRcblx0XHRjb25zdCB1bmxpc3RlbiA9IGF3YWl0IHdpbmQuYXBwV2luZG93Lmxpc3Rlbihcblx0XHRcdGB3YXRjaGVyOi8vcmF3LWV2ZW50LyR7aWR9YCxcblx0XHRcdGV2ZW50ID0+XG5cdFx0e1xuXHRcdFx0Y2FsbGJhY2tGbihldmVudCBhcyBUYXVyaVdhdGNoRXZlbnQpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiBhc3luYyAoKSA9PlxuXHRcdHtcblx0XHRcdGF3YWl0IHVud2F0Y2goaWQpO1xuXHRcdFx0dW5saXN0ZW4oKTtcblx0XHR9O1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRhc3luYyBmdW5jdGlvbiB3YXRjaEltbWVkaWF0ZShcblx0XHRwYXRoczogc3RyaW5nIHwgc3RyaW5nW10sXG5cdFx0b3B0aW9uczogRGVib3VuY2VkV2F0Y2hPcHRpb25zLFxuXHRcdGNhbGxiYWNrRm46IChldmVudDogVGF1cmlXYXRjaEV2ZW50KSA9PiB2b2lkKTogUHJvbWlzZTwoKSA9PiBQcm9taXNlPHZvaWQ+PlxuXHR7XG5cdFx0Y29uc3Qgb3B0cyA9IHtcblx0XHRcdHJlY3Vyc2l2ZTogZmFsc2UsXG5cdFx0XHQuLi5vcHRpb25zLFxuXHRcdFx0ZGVsYXlNczogbnVsbFxuXHRcdH07XG5cdFx0XG5cdFx0Y29uc3Qgd2F0Y2hQYXRocyA9IHR5cGVvZiBwYXRocyA9PT0gXCJzdHJpbmdcIiA/IFtwYXRoc10gOiBwYXRocztcblx0XHRjb25zdCBpZCA9IHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50MzJBcnJheSgxKSlbMF07XG5cdFx0XG5cdFx0YXdhaXQgdGF1cmkuaW52b2tlKFwicGx1Z2luOmZzLXdhdGNofHdhdGNoXCIsIHtcblx0XHRcdGlkLFxuXHRcdFx0cGF0aHM6IHdhdGNoUGF0aHMsXG5cdFx0XHRvcHRpb25zOiBvcHRzLFxuXHRcdH0pO1xuXHRcdFxuXHRcdGNvbnN0IHVubGlzdGVuID0gYXdhaXQgd2luZC5hcHBXaW5kb3cubGlzdGVuKFxuXHRcdFx0YHdhdGNoZXI6Ly9yYXctZXZlbnQvJHtpZH1gLFxuXHRcdFx0ZXZlbnQgPT5cblx0XHR7XG5cdFx0XHRjYWxsYmFja0ZuKGV2ZW50IGFzIFRhdXJpV2F0Y2hFdmVudCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIGFzeW5jICgpID0+XG5cdFx0e1xuXHRcdFx0YXdhaXQgdW53YXRjaChpZCk7XG5cdFx0XHR1bmxpc3RlbigpO1xuXHRcdH07XG5cdH1cblxuXHQvKiogKi9cblx0aW50ZXJmYWNlIFRhdXJpV2F0Y2hFdmVudFxuXHR7XG5cdFx0LyoqIEV4YW1wbGU6IFwid2F0Y2hlcjovL2RlYm91bmNlZC1ldmVudC8yOTAzMDMyXCIgKi9cblx0XHRyZWFkb25seSBldmVudDogc3RyaW5nO1xuXHRcdC8qKiBFeGFtcGxlOiBcIm1haW5cIiAqL1xuXHRcdHJlYWRvbmx5IHdpbmRvd0xhYmVsOiBzdHJpbmc7XG5cdFx0LyoqIEV4YW1wbGU6IC9Vc2Vycy91c2VyL0xpYnJhcnkvQXBwbGljYXRpb24gU3VwcG9ydC9jb20uYXBwL2ZpbGVuYW1lLnR4dCAqL1xuXHRcdHJlYWRvbmx5IHBheWxvYWQ6IHsgcGF5bG9hZDogc3RyaW5nOyB9O1xuXHRcdC8qKiAqL1xuXHRcdHJlYWRvbmx5IHR5cGU6IFxuXHRcdFx0XCJOb3RpY2VXcml0ZVwiIHxcblx0XHRcdFwiTm90aWNlUmVtb3ZlXCIgfFxuXHRcdFx0XCJDcmVhdGVcIiB8XG5cdFx0XHRcIldyaXRlXCIgfFxuXHRcdFx0XCJDaG1vZFwiIHxcblx0XHRcdFwiUmVtb3ZlXCIgfFxuXHRcdFx0XCJSZW5hbWVcIiB8XG5cdFx0XHRcIlJlc2NhblwiIHxcblx0XHRcdFwiRXJyb3JcIjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWFkb25seSBpZDogbnVtYmVyO1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRpbnRlcmZhY2UgV2F0Y2hPcHRpb25zXG5cdHtcblx0XHRyZWN1cnNpdmU/OiBib29sZWFuO1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRpbnRlcmZhY2UgRGVib3VuY2VkV2F0Y2hPcHRpb25zIGV4dGVuZHMgV2F0Y2hPcHRpb25zXG5cdHtcblx0XHRkZWxheU1zPzogbnVtYmVyO1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRmdW5jdGlvbiBnZXRNZXRhZGF0YShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPE1ldGFkYXRhPlxuXHR7XG5cdFx0cmV0dXJuIHRhdXJpLmludm9rZShcInBsdWdpbjpmcy1leHRyYXxtZXRhZGF0YVwiLCB7IHBhdGggfSk7XG5cdH1cblxuXHQvKipcblx0ICogTWV0YWRhdGEgaW5mb3JtYXRpb24gYWJvdXQgYSBmaWxlLlxuXHQgKiBUaGlzIHN0cnVjdHVyZSBpcyByZXR1cm5lZCBmcm9tIHRoZSBgbWV0YWRhdGFgIGZ1bmN0aW9uIG9yIG1ldGhvZFxuXHQgKiBhbmQgcmVwcmVzZW50cyBrbm93biBtZXRhZGF0YSBhYm91dCBhIGZpbGUgc3VjaCBhcyBpdHMgcGVybWlzc2lvbnMsXG5cdCAqIHNpemUsIG1vZGlmaWNhdGlvbiB0aW1lcywgZXRjLlxuXHQgKi9cblx0aW50ZXJmYWNlIE1ldGFkYXRhXG5cdHtcblx0XHQvKipcblx0XHQgKiBUaGUgbGFzdCBhY2Nlc3MgdGltZSBvZiB0aGlzIG1ldGFkYXRhLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGFjY2Vzc2VkQXQ6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgY3JlYXRpb24gdGltZSBsaXN0ZWQgaW4gdGhpcyBtZXRhZGF0YS5cblx0XHQgKi9cblx0XHRyZWFkb25seSBjcmVhdGVkQXQ6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgbGFzdCBtb2RpZmljYXRpb24gdGltZSBsaXN0ZWQgaW4gdGhpcyBtZXRhZGF0YS5cblx0XHQgKi9cblx0XHRyZWFkb25seSBtb2RpZmllZEF0OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogYHRydWVgIGlmIHRoaXMgbWV0YWRhdGEgaXMgZm9yIGEgZGlyZWN0b3J5LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGlzRGlyOiBib29sZWFuO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIGB0cnVlYCBpZiB0aGlzIG1ldGFkYXRhIGlzIGZvciBhIHJlZ3VsYXIgZmlsZS5cblx0XHQgKi9cblx0XHRyZWFkb25seSBpc0ZpbGU6IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogYHRydWVgIGlmIHRoaXMgbWV0YWRhdGEgaXMgZm9yIGEgc3ltYm9saWMgbGluay5cblx0XHQgKi9cblx0XHRyZWFkb25seSBpc1N5bWxpbms6IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIHNpemUgb2YgdGhlIGZpbGUsIGluIGJ5dGVzLCB0aGlzIG1ldGFkYXRhIGlzIGZvci5cblx0XHQgKi9cblx0XHRyZWFkb25seSBzaXplOiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIHBlcm1pc3Npb25zIG9mIHRoZSBmaWxlIHRoaXMgbWV0YWRhdGEgaXMgZm9yLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IHBlcm1pc3Npb25zOiBQZXJtaXNzaW9ucztcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgSUQgb2YgdGhlIGRldmljZSBjb250YWluaW5nIHRoZSBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGRldj86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgaW5vZGUgbnVtYmVyLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGlubz86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgcmlnaHRzIGFwcGxpZWQgdG8gdGhpcyBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IG1vZGU/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIG51bWJlciBvZiBoYXJkIGxpbmtzIHBvaW50aW5nIHRvIHRoaXMgZmlsZS4gT25seSBhdmFpbGFibGUgb24gVW5peC5cblx0XHQgKi9cblx0XHRyZWFkb25seSBubGluaz86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgdXNlciBJRCBvZiB0aGUgb3duZXIgb2YgdGhpcyBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IHVpZD86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgZ3JvdXAgSUQgb2YgdGhlIG93bmVyIG9mIHRoaXMgZmlsZS4gT25seSBhdmFpbGFibGUgb24gVW5peC5cblx0XHQgKi9cblx0XHRyZWFkb25seSBnaWQ/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIGRldmljZSBJRCBvZiB0aGlzIGZpbGUgKGlmIGl0IGlzIGEgc3BlY2lhbCBvbmUpLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IHJkZXY/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIGJsb2NrIHNpemUgZm9yIGZpbGVzeXN0ZW0gSS9PLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGJsa3NpemU/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIG51bWJlciBvZiBibG9ja3MgYWxsb2NhdGVkIHRvIHRoZSBmaWxlLCBpbiA1MTItYnl0ZSB1bml0cy4gT25seSBhdmFpbGFibGUgb24gVW5peC5cblx0XHQgKi9cblx0XHRyZWFkb25seSBibG9ja3M/OiBudW1iZXI7XG5cdH1cblxuXHQvKiogKi9cblx0aW50ZXJmYWNlIFBlcm1pc3Npb25zXG5cdHtcblx0XHQvKipcblx0XHQgKiBgdHJ1ZWAgaWYgdGhlc2UgcGVybWlzc2lvbnMgZGVzY3JpYmUgYSByZWFkb25seSAodW53cml0YWJsZSkgZmlsZS5cblx0XHQgKi9cblx0XHRyZWFkb25seTogYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgdW5kZXJseWluZyByYXcgYHN0X21vZGVgIGJpdHMgdGhhdCBjb250YWluIHRoZSBzdGFuZGFyZCBVbml4XG5cdFx0ICogcGVybWlzc2lvbnMgZm9yIHRoaXMgZmlsZS5cblx0XHQgKi9cblx0XHRtb2RlPzogbnVtYmVyO1xuXHR9XG5cdFx0XG5cdHtcblx0XHRsZXQgcGF0aDogdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS5wYXRoIHwgbnVsbCA9IG51bGw7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0cGF0aCA9IChnbG9iYWxUaGlzIGFzIGFueSkuX19UQVVSSV9fLnBhdGggYXMgdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS5wYXRoO1xuXHRcdH1cblx0XHRjYXRjaCAoZSlcblx0XHR7XG5cdFx0XHRjb25zb2xlLmxvZyhcIndpdGhHbG9iYWxUYXVyaSBpcyBub3Qgc2V0XCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdCBzZXAgPSBwYXRoPy5zZXAgfHwgXCIvXCI7XG5cdFx0Y29uc3QgY3dkID0gXCIvXCI7XG5cdFx0Y29uc3QgdG1wID0gXCIvXCI7XG5cdFx0RmlsYS5zZXR1cChGaWxhVGF1cmksIHNlcCwgY3dkLCB0bXApO1xuXHRcdFxuXHRcdChhc3luYyAoKSA9PlxuXHRcdHtcblx0XHRcdC8vIFRoaXMgaXMgYSBodWdlIGhhY2suLi4gYnV0IHdpdGhvdXQgdGhpcywgdGhlIHNldHVwIG5lZWRzXG5cdFx0XHQvLyBzb21lIGFzeW5jIHdoaWNoIG1lYW5zIHRoYXQgaXQgY2FuJ3QgYmUgZG9uZVxuXHRcdFx0Y29uc3QgdG1wID0gYXdhaXQgcGF0aC5hcHBDYWNoZURpcigpO1xuXHRcdFx0RmlsYS5zZXR1cChGaWxhVGF1cmksIHNlcCwgY3dkLCB0bXApO1xuXHRcdH0pKCk7XG5cdH1cbn0pKCk7XG4iLCJcbm5hbWVzcGFjZSBDb3Zlclxue1xuXHQvKiogKi9cblx0ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvdmVyRmlsYVdlYigpXG5cdHtcblx0XHRjb25zdCBkaXIgPSBuZXcgRmlsYShcImRpclwiKTtcblx0XHRkaXIud3JpdGVEaXJlY3RvcnkoKTtcblx0XHRcblx0XHRjb25zdCBmaWxhVGV4dCA9IGRpci5kb3duKFwiZmlsZS50eHRcIik7XG5cdFx0YXdhaXQgZmlsYVRleHQud3JpdGVUZXh0KFwieWF5IVwiKTtcblx0XHRcblx0XHRjb25zdCBmaWxhQmluYXJ5ID0gZGlyLmRvd24oXCJmaWxlLmJpblwiKTtcblx0XHRjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheShbMCwgMSwgMl0pO1xuXHRcdGF3YWl0IGZpbGFCaW5hcnkud3JpdGVCaW5hcnkoYnVmZmVyKTtcblx0XHRcblx0XHRjb25zdCBjb250ZW50cyA9IGF3YWl0IGRpci5yZWFkRGlyZWN0b3J5KCk7XG5cdFx0Zm9yIChjb25zdCBmaWxhIG9mIGNvbnRlbnRzKVxuXHRcdFx0Y29uc29sZS5sb2coZmlsYS5wYXRoKTtcblx0XHRcblx0XHRhd2FpdCBkaXIuZGVsZXRlKCk7XG5cdFx0ZGVidWdnZXI7XG5cdH1cblx0XG5cdGRlY2xhcmUgY29uc3QgbW9kdWxlOiBhbnk7XG5cdHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgT2JqZWN0LmFzc2lnbihtb2R1bGUuZXhwb3J0cywgeyBDb3ZlciB9KTtcbn1cbiIsIlxuLyoqIEBpbnRlcm5hbCAqL1xuZGVjbGFyZSBjb25zdCBXRUI6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIFdFQiA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRPYmplY3QuYXNzaWduKGdsb2JhbFRoaXMsIHsgV0VCOiAhTk9ERSAmJiAhQ0FQQUNJVE9SICYmICFUQVVSSSAmJiB0eXBlb2YgaW5kZXhlZERCID09PSBcIm9iamVjdFwiIH0pXG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKCFXRUIpIHJldHVybjtcblx0XG5cdHR5cGUgS2V5dmEgPSB0eXBlb2YgaW1wb3J0KFwia2V5dmFqc1wiKTtcblx0XG5cdGNsYXNzIEZpbGFXZWIgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogQGludGVybmFsICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMga2V5dmE6IEtleXZhO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKGZpbGE6IEZpbGEpXG5cdFx0e1xuXHRcdFx0c3VwZXIoZmlsYSk7XG5cdFx0XHRGaWxhV2ViLmtleXZhIHx8PSBuZXcgS2V5dmEoeyBuYW1lOiBcImZpbGFcIiB9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZFRleHQoKVxuXHRcdHtcblx0XHRcdHJldHVybiBhd2FpdCBGaWxhV2ViLmtleXZhLmdldDxzdHJpbmc+KHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZEJpbmFyeSgpOiBQcm9taXNlPEFycmF5QnVmZmVyPlxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0cmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgP1xuXHRcdFx0XHR2YWx1ZSA6XG5cdFx0XHRcdG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWREaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdGNvbnN0IHJhbmdlID0gS2V5dmEucHJlZml4KHRoaXMuZmlsYS5wYXRoICsgXCIvXCIpO1xuXHRcdFx0Y29uc3QgY29udGVudHMgPSBhd2FpdCBGaWxhV2ViLmtleXZhLmVhY2goeyByYW5nZSB9LCBcImtleXNcIik7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qga2V5IG9mIGNvbnRlbnRzKVxuXHRcdFx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKGtleSkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdGxldCBjdXJyZW50ID0gdGhpcy5maWxhLnVwKCk7XG5cdFx0XHRjb25zdCBtaXNzaW5nRm9sZGVyczogRmlsYVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoOzspXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChhd2FpdCBjdXJyZW50LmV4aXN0cygpKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0bWlzc2luZ0ZvbGRlcnMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChjdXJyZW50LnVwKCkucGF0aCA9PT0gY3VycmVudC5wYXRoKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQudXAoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmb2xkZXIgb2YgbWlzc2luZ0ZvbGRlcnMpXG5cdFx0XHRcdGF3YWl0IGZvbGRlci53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0XG5cdFx0XHRpZiAob3B0aW9ucz8uYXBwZW5kKVxuXHRcdFx0XHR0ZXh0ID0gKFwiXCIgKyAoYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpIHx8IFwiXCIpKSArIHRleHQ7XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCB0ZXh0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCBhcnJheUJ1ZmZlcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGlmIChhd2FpdCB0aGlzLmV4aXN0cygpKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBIGZpbGUgYWxyZWFkeSBleGlzdHMgYXQgdGhpcyBsb2NhdGlvbi5cIik7XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCBudWxsKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdFx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0YXN5bmMgd3JpdGVTeW1saW5rKGF0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdFx0ICovXG5cdFx0YXN5bmMgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPlxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJhbmdlID0gS2V5dmEucHJlZml4KHRoaXMuZmlsYS5wYXRoICsgXCIvXCIpO1xuXHRcdFx0XHRhd2FpdCBGaWxhV2ViLmtleXZhLmRlbGV0ZShyYW5nZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuZGVsZXRlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgbW92ZSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgY29weSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0d2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sXG5cdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEsIHNlY29uZGFyeUZpbGE/OiBGaWxhKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHRcdHJldHVybiAoKSA9PiB7fTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVuYW1lKG5ld05hbWU6IHN0cmluZylcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0cmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRNb2RpZmllZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0Q3JlYXRlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGlzRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpID09PSBudWxsO1xuXHRcdH1cblx0fVxuXHRcblx0RmlsYS5zZXR1cChGaWxhV2ViLCBcIi9cIiwgXCIvXCIsIFwiL19fdGVtcC9cIik7XG59KSgpOyJdfQ==