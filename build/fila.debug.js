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
        this.components = components;
        components = components.filter(s => !!s);
        if (components.join("") !== "/") {
            if (components.length === 0 || components[0].startsWith("."))
                components.unshift(Fila.cwd.path);
            for (let i = -1; ++i < components.length;)
                components.splice(i, 1, ...components[i].split(Fila.sep));
            components = components.filter(s => !!s);
            components = Fila.normalize(components.join(Fila.sep)).split(Fila.sep);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsYS5kZWJ1Zy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2ZpbGEvRmlsYS50cyIsIi4uL2ZpbGEtY2FwYWNpdG9yL0ZpbGFDYXBhY2l0b3IudHMiLCIuLi9maWxhLW5vZGUvRmlsYU5vZGUuY292ZXIudHMiLCIuLi9maWxhLW5vZGUvRmlsYU5vZGUudHMiLCIuLi9maWxhLXRhdXJpL0ZpbGFUYXVyaS50cyIsIi4uL2ZpbGEtd2ViL0ZpbGFXZWIuY292ZXIudHMiLCIuLi9maWxhLXdlYi9GaWxhV2ViLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxNQUFNLElBQUk7SUFFVDs7O09BR0c7SUFDSCxNQUFNLENBQVUsV0FBVyxHQUFHLENBQUMsR0FBRyxFQUFFO1FBRW5DLE1BQWUsV0FBVztZQUVNO1lBQS9CLFlBQStCLElBQVU7Z0JBQVYsU0FBSSxHQUFKLElBQUksQ0FBTTtZQUFJLENBQUM7U0F3QjlDO1FBRUQsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUVMOzs7O09BSUc7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQWdDLEVBQUUsR0FBVyxFQUFFLEdBQVcsRUFBRSxJQUFZO1FBRXBGLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUN2QixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUssQ0FBQztJQUN6QixDQUFDO0lBRU8sTUFBTSxDQUFDLE9BQU8sQ0FBMEI7SUFFaEQ7O09BRUc7SUFDSCxNQUFNLEtBQUssR0FBRztRQUViLE9BQU8sSUFBSSxDQUFDLElBQWtCLENBQUM7SUFDaEMsQ0FBQztJQUNPLE1BQU0sQ0FBQyxJQUFJLEdBQVcsR0FBRyxDQUFDO0lBRWxDOztPQUVHO0lBQ0gsTUFBTSxLQUFLLEdBQUc7UUFFYixJQUFJLE9B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RCxPQUFPLEtBQUssS0FBSyxTQUFTLENBQUM7UUFDNUIsQ0FBQztRQUVELE1BQU07UUFDTixLQUFLLENBQUMsT0FBTztZQUVaLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUVELE1BQU07UUFDTixLQUFLLENBQUMsZ0JBQWdCO1lBRXJCLE9BQU8sQ0FBQyxDQUFDO1FBQ1YsQ0FBQztRQUVELE1BQU07UUFDTixLQUFLLENBQUMsZUFBZTtZQUVwQixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFFRCxNQUFNO1FBQ04sS0FBSyxDQUFDLGdCQUFnQjtZQUVyQixPQUFPLENBQUMsQ0FBQztRQUNWLENBQUM7UUFFRCxNQUFNO1FBQ04sS0FBSyxDQUFDLFdBQVc7WUFFaEIsT0FBTyxNQUFNLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDO1FBQ3pELENBQUM7S0FDRDtJQUVELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIlxuY2xhc3MgRmlsYVxue1xuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIEFic3RyYWN0IGNsYXNzIHRoYXQgbXVzdCBiZSBpbXBsZW1lbnRlZCBieSBGaWxhIGJhY2tlbmRzLlxuXHQgKi9cblx0c3RhdGljIHJlYWRvbmx5IEZpbGFCYWNrZW5kID0gKCgpID0+XG5cdHtcblx0XHRhYnN0cmFjdCBjbGFzcyBGaWxhQmFja2VuZFxuXHRcdHtcblx0XHRcdGNvbnN0cnVjdG9yKHByb3RlY3RlZCByZWFkb25seSBmaWxhOiBGaWxhKSB7IH1cblx0XHRcdFxuXHRcdFx0YWJzdHJhY3QgcmVhZFRleHQoKTogUHJvbWlzZTxzdHJpbmc+O1xuXHRcdFx0YWJzdHJhY3QgcmVhZEJpbmFyeSgpOiBQcm9taXNlPEFycmF5QnVmZmVyPjtcblx0XHRcdGFic3RyYWN0IHJlYWREaXJlY3RvcnkoKTogUHJvbWlzZTxGaWxhW10+O1xuXHRcdFx0YWJzdHJhY3Qgd3JpdGVUZXh0KHRleHQ6IHN0cmluZywgb3B0aW9ucz86IEZpbGEuSVdyaXRlVGV4dE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3Qgd3JpdGVCaW5hcnkoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IFByb21pc2U8dm9pZD47XG5cdFx0XHRhYnN0cmFjdCB3cml0ZURpcmVjdG9yeSgpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3Qgd3JpdGVTeW1saW5rKGF0OiBGaWxhKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdGFic3RyYWN0IGRlbGV0ZSgpOiBQcm9taXNlPEVycm9yIHwgdm9pZD47XG5cdFx0XHRhYnN0cmFjdCBtb3ZlKHRhcmdldDogRmlsYSk6IFByb21pc2U8dm9pZD47XG5cdFx0XHRhYnN0cmFjdCBjb3B5KHRhcmdldDogRmlsYSk6IFByb21pc2U8dm9pZD47XG5cdFx0XHRcblx0XHRcdGFic3RyYWN0IHdhdGNoUHJvdGVjdGVkKFxuXHRcdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sIFxuXHRcdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpOiAoKSA9PiB2b2lkO1xuXHRcdFx0XG5cdFx0XHRhYnN0cmFjdCByZW5hbWUobmV3TmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdGFic3RyYWN0IGV4aXN0cygpOiBQcm9taXNlPGJvb2xlYW4+O1xuXHRcdFx0YWJzdHJhY3QgZ2V0U2l6ZSgpOiBQcm9taXNlPG51bWJlcj47XG5cdFx0XHRhYnN0cmFjdCBnZXRNb2RpZmllZFRpY2tzKCk6IFByb21pc2U8bnVtYmVyPjtcblx0XHRcdGFic3RyYWN0IGdldENyZWF0ZWRUaWNrcygpOiBQcm9taXNlPG51bWJlcj47XG5cdFx0XHRhYnN0cmFjdCBnZXRBY2Nlc3NlZFRpY2tzKCk6IFByb21pc2U8bnVtYmVyPjtcblx0XHRcdGFic3RyYWN0IGlzRGlyZWN0b3J5KCk6IFByb21pc2U8Ym9vbGVhbj47XG5cdFx0fVxuXHRcdFxuXHRcdHJldHVybiBGaWxhQmFja2VuZDtcblx0fSkoKTtcblx0XG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogRWFjaCBiYWNrZW5kIGNhbGxzIHRoaXMgbWV0aG9kIHRvIHBlcmZvcm0gdGhlIHNldHVwIGZ1bmN0aW9ucy5cblx0ICogVGhpcyBpcyB0aGUgaW50ZXJuYWwgLnNldHVwKCkgb3ZlcmxvYWQgdGhhdCBpcyBjYWxsZWQgYnkgZWFjaCBpbXBsZW1lbnRvci5cblx0ICovXG5cdHN0YXRpYyBzZXR1cChiYWNrZW5kOiB0eXBlb2YgRmlsYS5GaWxhQmFja2VuZCwgc2VwOiBzdHJpbmcsIGN3ZDogc3RyaW5nLCB0ZW1wOiBzdHJpbmcpXG5cdHtcblx0XHR0aGlzLmJhY2tlbmQgPSBiYWNrZW5kO1xuXHRcdHRoaXMuX3NlcCA9IHNlcCB8fCBcIi9cIjtcblx0XHR0aGlzLl9jd2QgPSBjd2QhO1xuXHRcdHRoaXMuX3RlbXBvcmFyeSA9IHRlbXAhO1xuXHR9XG5cdFxuXHRwcml2YXRlIHN0YXRpYyBiYWNrZW5kOiB0eXBlb2YgRmlsYS5GaWxhQmFja2VuZDtcblx0XG5cdC8qKlxuXHQgKiBQYXRoIHNlcGFyYXRvci5cblx0ICovXG5cdHN0YXRpYyBnZXQgc2VwKClcblx0e1xuXHRcdHJldHVybiB0aGlzLl9zZXAgYXMgXCJcXFxcXCIgfCBcIi9cIjtcblx0fVxuXHRwcml2YXRlIHN0YXRpYyBfc2VwOiBzdHJpbmcgPSBcIi9cIjtcblx0XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBjdXJyZW50IHdvcmtpbmcgZGlyZWN0b3J5IG9mIHRoZSBwcm9jZXNzLlxuXHQgKi9cblx0c3RhdGljIGdldCBjd2QoKVxuXHR7XG5cdFx0aWYgKHR5cGVvZiB0aGlzLl9jd2QgPT09IFwic3RyaW5nXCIpXG5cdFx0XHRyZXR1cm4gdGhpcy5fY3dkID0gbmV3IEZpbGEodGhpcy5fY3dkKTtcblx0XHRcblx0XHRyZXR1cm4gdGhpcy5fY3dkO1xuXHR9XG5cdHByaXZhdGUgc3RhdGljIF9jd2Q6IEZpbGEgfCBzdHJpbmcgPSBcIlwiO1xuXHRcblx0LyoqXG5cdCAqIFxuXHQgKi9cblx0c3RhdGljIGdldCB0ZW1wb3JhcnkoKVxuXHR7XG5cdFx0aWYgKHR5cGVvZiB0aGlzLl90ZW1wb3JhcnkgPT09IFwic3RyaW5nXCIpXG5cdFx0XHRyZXR1cm4gdGhpcy5fdGVtcG9yYXJ5ID0gbmV3IEZpbGEodGhpcy5fdGVtcG9yYXJ5KTtcblx0XHRcblx0XHRyZXR1cm4gdGhpcy5fdGVtcG9yYXJ5O1xuXHR9XG5cdHByaXZhdGUgc3RhdGljIF90ZW1wb3Jhcnk6IEZpbGEgfCBzdHJpbmcgPSBcIlwiO1xuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgYSBGaWxhIGluc3RhbmNlIGZyb20gdGhlIHNwZWNpZmllZCBwYXRoIGluIHRoZSBjYXNlIHdoZW5cblx0ICogYSBzdHJpbmcgaXMgcHJvdmlkZWQsIG9yIHJldHVybnMgdGhlIEZpbGEgaW5zdGFuY2UgYXMtaXMgd2hlbiBhIEZpbGFcblx0ICogb2JqZWN0IGlzIHByb3ZpZGVkLlxuXHQgKi9cblx0c3RhdGljIGZyb20odmlhOiBzdHJpbmcgfCBGaWxhKVxuXHR7XG5cdFx0cmV0dXJuIHR5cGVvZiB2aWEgPT09IFwic3RyaW5nXCIgPyBuZXcgRmlsYSh2aWEpIDogdmlhO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0Y29uc3RydWN0b3IoLi4uY29tcG9uZW50czogc3RyaW5nW10pXG5cdHtcblx0XHR0aGlzLmNvbXBvbmVudHMgPSBjb21wb25lbnRzO1xuXHRcdGNvbXBvbmVudHMgPSBjb21wb25lbnRzLmZpbHRlcihzID0+ICEhcyk7XG5cdFx0XG5cdFx0aWYgKGNvbXBvbmVudHMuam9pbihcIlwiKSAhPT0gXCIvXCIpXG5cdFx0e1xuXHRcdFx0aWYgKGNvbXBvbmVudHMubGVuZ3RoID09PSAwIHx8IGNvbXBvbmVudHNbMF0uc3RhcnRzV2l0aChcIi5cIikpXG5cdFx0XHRcdGNvbXBvbmVudHMudW5zaGlmdChGaWxhLmN3ZC5wYXRoKTtcblx0XHRcdFxuXHRcdFx0Zm9yIChsZXQgaSA9IC0xOyArK2kgPCBjb21wb25lbnRzLmxlbmd0aDspXG5cdFx0XHRcdGNvbXBvbmVudHMuc3BsaWNlKGksIDEsIC4uLmNvbXBvbmVudHNbaV0uc3BsaXQoRmlsYS5zZXApKTtcblx0XHRcdFxuXHRcdFx0Y29tcG9uZW50cyA9IGNvbXBvbmVudHMuZmlsdGVyKHMgPT4gISFzKTtcblx0XHRcdGNvbXBvbmVudHMgPSBGaWxhLm5vcm1hbGl6ZShjb21wb25lbnRzLmpvaW4oRmlsYS5zZXApKS5zcGxpdChGaWxhLnNlcCk7XG5cdFx0fVxuXHRcdFxuXHRcdGxldCBiYWNrOiBJbnN0YW5jZVR5cGU8dHlwZW9mIEZpbGEuRmlsYUJhY2tlbmQ+O1xuXHRcdC8vQHRzLWlnbm9yZVxuXHRcdGJhY2sgPSBuZXcgRmlsYS5iYWNrZW5kKHRoaXMpO1xuXHRcdHRoaXMuYmFjayA9IGJhY2s7XG5cdH1cblx0XG5cdHJlYWRvbmx5IGNvbXBvbmVudHM7XG5cdHByaXZhdGUgcmVhZG9ubHkgYmFjazogSW5zdGFuY2VUeXBlPHR5cGVvZiBGaWxhLkZpbGFCYWNrZW5kPjtcblx0XG5cdC8qKiAqL1xuXHRyZWFkVGV4dCgpOiBQcm9taXNlPHN0cmluZz4geyByZXR1cm4gdGhpcy5iYWNrLnJlYWRUZXh0KCk7IH1cblx0XG5cdC8qKiAqL1xuXHRyZWFkQmluYXJ5KCk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5yZWFkQmluYXJ5KCk7IH1cblx0XG5cdC8qKiAqL1xuXHRyZWFkRGlyZWN0b3J5KCk6IFByb21pc2U8RmlsYVtdPiB7IHJldHVybiB0aGlzLmJhY2sucmVhZERpcmVjdG9yeSgpOyB9XG5cdFxuXHQvKiogKi9cblx0d3JpdGVUZXh0KHRleHQ6IHN0cmluZywgb3B0aW9ucz86IEZpbGEuSVdyaXRlVGV4dE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+XG5cdHtcblx0XHRyZXR1cm4gdGhpcy5iYWNrLndyaXRlVGV4dCh0ZXh0LCBvcHRpb25zKTtcblx0fVxuXHRcblx0LyoqICovXG5cdHdyaXRlQmluYXJ5KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay53cml0ZUJpbmFyeShidWZmZXIpOyB9XG5cdFxuXHQvKiogKi9cblx0d3JpdGVEaXJlY3RvcnkoKTogUHJvbWlzZTx2b2lkPiB7IHJldHVybiB0aGlzLmJhY2sud3JpdGVEaXJlY3RvcnkoKTsgfVxuXHRcblx0LyoqXG5cdCAqIFdyaXRlcyBhIHN5bWxpbmsgZmlsZSBhdCB0aGUgbG9jYXRpb24gcmVwcmVzZW50ZWQgYnkgdGhlIHNwZWNpZmllZFxuXHQgKiBGaWxhIG9iamVjdCwgdG8gdGhlIGxvY2F0aW9uIHNwZWNpZmllZCBieSB0aGUgY3VycmVudCBGaWxhIG9iamVjdC5cblx0ICovXG5cdHdyaXRlU3ltbGluayhhdDogRmlsYSk6IFByb21pc2U8dm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLndyaXRlU3ltbGluayhhdCk7IH1cblx0XG5cdC8qKlxuXHQgKiBEZWxldGVzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSB0aGF0IHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cy5cblx0ICovXG5cdGRlbGV0ZSgpOiBQcm9taXNlPEVycm9yIHwgdm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLmRlbGV0ZSgpOyB9XG5cdFxuXHQvKiogKi9cblx0bW92ZSh0YXJnZXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay5tb3ZlKHRhcmdldCk7IH1cblx0XG5cdC8qKlxuXHQgKiBDb3BpZXMgdGhlIGZpbGUgdG8gdGhlIHNwZWNpZmllZCBsb2NhdGlvbiwgYW5kIGNyZWF0ZXMgYW55XG5cdCAqIG5lY2Vzc2FyeSBkaXJlY3RvcmllcyBhbG9uZyB0aGUgd2F5LlxuXHQgKi9cblx0Y29weSh0YXJnZXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay5jb3B5KHRhcmdldCk7IH1cblx0XG5cdC8qKlxuXHQgKiBSZWN1cnNpdmVseSB3YXRjaGVzIHRoaXMgZm9sZGVyLCBhbmQgYWxsIG5lc3RlZCBmaWxlcyBjb250YWluZWRcblx0ICogd2l0aGluIGFsbCBzdWJmb2xkZXJzLiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0ZXJtaW5hdGVzXG5cdCAqIHRoZSB3YXRjaCBzZXJ2aWNlIHdoZW4gY2FsbGVkLlxuXHQgKi9cblx0d2F0Y2goXG5cdFx0cmVjdXJzaXZlOiBcInJlY3Vyc2l2ZVwiLFxuXHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZCk6ICgpID0+IHZvaWQ7XG5cdC8qKlxuXHQgKiBXYXRjaGVzIGZvciBjaGFuZ2VzIHRvIHRoZSBzcGVjaWZpZWQgZmlsZSBvciBmb2xkZXIuIFJldHVybnNcblx0ICogYSBmdW5jdGlvbiB0aGF0IHRlcm1pbmF0ZXMgdGhlIHdhdGNoIHNlcnZpY2Ugd2hlbiBjYWxsZWQuXG5cdCAqL1xuXHR3YXRjaChcblx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpOiAoKSA9PiB2b2lkO1xuXHQvKiogKi9cblx0d2F0Y2goYTogYW55LCBiPzogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKVxuXHR7XG5cdFx0Y29uc3QgcmVjdXJzaXZlID0gYSA9PT0gXCJyZWN1cnNpdmVcIjtcblx0XHRjb25zdCBjYWxsYmFja0ZuID0gYiB8fCBhO1xuXHRcdHJldHVybiB0aGlzLndhdGNoUHJvdGVjdGVkKHJlY3Vyc2l2ZSwgY2FsbGJhY2tGbik7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRwcm90ZWN0ZWQgd2F0Y2hQcm90ZWN0ZWQoXG5cdFx0cmVjdXJzaXZlOiBib29sZWFuLCBcblx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpOiAoKSA9PiB2b2lkXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5iYWNrLndhdGNoUHJvdGVjdGVkKHJlY3Vyc2l2ZSwgY2FsbGJhY2tGbik7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRyZW5hbWUobmV3TmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7IHJldHVybiB0aGlzLmJhY2sucmVuYW1lKG5ld05hbWUpOyB9XG5cdFxuXHQvKiogKi9cblx0ZXhpc3RzKCk6IFByb21pc2U8Ym9vbGVhbj4geyByZXR1cm4gdGhpcy5iYWNrLmV4aXN0cygpOyB9XG5cdFxuXHQvKiogKi9cblx0Z2V0U2l6ZSgpOiBQcm9taXNlPG51bWJlcj4geyByZXR1cm4gdGhpcy5iYWNrLmdldFNpemUoKTsgfVxuXHRcblx0LyoqICovXG5cdGdldE1vZGlmaWVkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5nZXRNb2RpZmllZFRpY2tzKCk7IH1cblx0XG5cdC8qKiAqL1xuXHRnZXRDcmVhdGVkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5nZXRDcmVhdGVkVGlja3MoKTsgfVxuXHRcblx0LyoqICovXG5cdGdldEFjY2Vzc2VkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5nZXRBY2Nlc3NlZFRpY2tzKCk7IH1cblx0XG5cdC8qKiAqL1xuXHRpc0RpcmVjdG9yeSgpOiBQcm9taXNlPGJvb2xlYW4+IHsgcmV0dXJuIHRoaXMuYmFjay5pc0RpcmVjdG9yeSgpOyB9XG5cdFxuXHQvKipcblx0ICogSW4gdGhlIGNhc2Ugd2hlbiB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMgYSBmaWxlLCB0aGlzIG1ldGhvZCByZXR1cm5zIGEgXG5cdCAqIEZpbGEgb2JqZWN0IHRoYXQgcmVwcmVzZW50cyB0aGUgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgc2FpZCBmaWxlLlxuXHQgKiBcblx0ICogSW4gdGhlIGNhc2Ugd2hlbiB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMgYSBkaXJlY3RvcnksIHRoaXMgbWV0aG9kXG5cdCAqIHJldHVybnMgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QgYXMtaXMuXG5cdCAqL1xuXHRhc3luYyBnZXREaXJlY3RvcnkoKTogUHJvbWlzZTxGaWxhPlxuXHR7XG5cdFx0aWYgKGF3YWl0IHRoaXMuaXNEaXJlY3RvcnkoKSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFxuXHRcdHJldHVybiBuZXcgRmlsYSguLi50aGlzLnVwKCkuY29tcG9uZW50cyk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSBuYW1lIG9mIHRoZSBmaWxlIHN5c3RlbSBvYmplY3QgYmVpbmdcblx0ICogcmVwcmVzZW50ZWQgYnkgdGhpcyBGaWxhIG9iamVjdC5cblx0ICovXG5cdGdldCBuYW1lKClcblx0e1xuXHRcdHJldHVybiB0aGlzLmNvbXBvbmVudHMuYXQoLTEpIHx8IFwiXCI7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHZXQgdGhlIGZpbGUgZXh0ZW5zaW9uIG9mIHRoZSBmaWxlIGJlaW5nIHJlcHJlc2VudGVkIGJ5IHRoaXNcblx0ICogRmlsYSBvYmplY3QsIHdpdGggdGhlIFwiLlwiIGNoYXJhY3Rlci5cblx0ICovXG5cdGdldCBleHRlbnNpb24oKVxuXHR7XG5cdFx0Y29uc3QgbmFtZSA9IHRoaXMubmFtZTtcblx0XHRjb25zdCBsYXN0RG90ID0gbmFtZS5sYXN0SW5kZXhPZihcIi5cIik7XG5cdFx0cmV0dXJuIGxhc3REb3QgPCAwID8gXCJcIiA6IG5hbWUuc2xpY2UobGFzdERvdCk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBmdWxseS1xdWFsaWZpZWQgcGF0aCwgaW5jbHVkaW5nIGFueSBmaWxlIG5hbWUgdG8gdGhlXG5cdCAqIGZpbGUgc3lzdGVtIG9iamVjdCBiZWluZyByZXByZXNlbnRlZCBieSB0aGlzIEZpbGEgb2JqZWN0LlxuXHQgKi9cblx0Z2V0IHBhdGgoKVxuXHR7XG5cdFx0cmV0dXJuIEZpbGEuc2VwICsgRmlsYS5qb2luKC4uLnRoaXMuY29tcG9uZW50cyk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgRmlsYSBvYmplY3QgdGhhdCByZXByZXNlbnRzIHRoZSBmaXJzdCBvciBudGggY29udGFpbmluZ1xuXHQgKiBkaXJlY3Rvcnkgb2YgdGhlIG9iamVjdCB0aGF0IHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cy5cblx0ICogUmV0dXJucyB0aGUgdGhpcyByZWZlcmVuY2UgaW4gdGhlIGNhc2Ugd2hlbiB0aGUgXG5cdCAqL1xuXHR1cChjb3VudCA9IDEpXG5cdHtcblx0XHRpZiAodGhpcy5jb21wb25lbnRzLmxlbmd0aCA8IDIpXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcblx0XHRjb25zdCBwYXJlbnRDb21wb25lbnRzID0gdGhpcy5jb21wb25lbnRzLnNsaWNlKDAsIC1jb3VudCk7XG5cdFx0cmV0dXJuIHBhcmVudENvbXBvbmVudHMubGVuZ3RoID4gMCA/XG5cdFx0XHRuZXcgRmlsYSguLi5wYXJlbnRDb21wb25lbnRzKSA6XG5cdFx0XHRuZXcgRmlsYShcIi9cIik7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBTZWFyY2hlcyB1cHdhcmQgdGhyb3VnaCB0aGUgZmlsZSBzeXN0ZW0gYW5jZXN0cnkgZm9yIGEgbmVzdGVkIGZpbGUuXG5cdCAqL1xuXHRhc3luYyB1cHNjYW4ocmVsYXRpdmVGaWxlTmFtZTogc3RyaW5nKVxuXHR7XG5cdFx0bGV0IGFuY2VzdHJ5ID0gdGhpcyBhcyBGaWxhO1xuXHRcdFxuXHRcdGRvXG5cdFx0e1xuXHRcdFx0Y29uc3QgbWF5YmUgPSBhbmNlc3RyeS5kb3duKHJlbGF0aXZlRmlsZU5hbWUpO1xuXHRcdFx0aWYgKGF3YWl0IG1heWJlLmV4aXN0cygpKVxuXHRcdFx0XHRyZXR1cm4gbWF5YmU7XG5cdFx0XHRcblx0XHRcdGlmIChhbmNlc3RyeS5jb21wb25lbnRzLmxlbmd0aCA9PT0gMSlcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGFuY2VzdHJ5ID0gYW5jZXN0cnkudXAoKTtcblx0XHR9XG5cdFx0d2hpbGUgKGFuY2VzdHJ5LmNvbXBvbmVudHMubGVuZ3RoID4gMCk7XG5cdFx0XG5cdFx0cmV0dXJuIG51bGwgYXMgYW55IGFzIEZpbGEgfCBudWxsO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIEZpbGEgb2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIGZpbGUgb3IgZGlyZWN0b3J5IG5lc3RlZFxuXHQgKiB3aXRoaW4gdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QgKHdoaWNoIG11c3QgYmUgYSBkaXJlY3RvcnkpLlxuXHQgKi9cblx0ZG93biguLi5hZGRpdGlvbmFsQ29tcG9uZW50czogc3RyaW5nW10pXG5cdHtcblx0XHRyZXR1cm4gbmV3IEZpbGEoLi4udGhpcy5jb21wb25lbnRzLCAuLi5hZGRpdGlvbmFsQ29tcG9uZW50cyk7XG5cdH1cbn1cblxubmFtZXNwYWNlIEZpbGFcbntcblx0LyoqICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSVdyaXRlVGV4dE9wdGlvbnNcblx0e1xuXHRcdHJlYWRvbmx5IGFwcGVuZDogYm9vbGVhbjtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBmdW5jdGlvbiBqb2luKC4uLmFyZ3M6IHN0cmluZ1tdKVxuXHR7XG5cdFx0aWYgKGFyZ3MubGVuZ3RoID09PSAwKVxuXHRcdFx0cmV0dXJuIFwiLlwiO1xuXHRcdFxuXHRcdGxldCBqb2luZWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyArK2kpXG5cdFx0e1xuXHRcdFx0bGV0IGFyZyA9IGFyZ3NbaV07XG5cdFx0XHRcblx0XHRcdGlmIChhcmcubGVuZ3RoID4gMClcblx0XHRcdHtcblx0XHRcdFx0aWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0XHRcdGpvaW5lZCA9IGFyZztcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGpvaW5lZCArPSBcIi9cIiArIGFyZztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0aWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0cmV0dXJuIFwiLlwiO1xuXHRcdFxuXHRcdHJldHVybiBub3JtYWxpemUoam9pbmVkKTtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemUocGF0aDogc3RyaW5nKVxuXHR7XG5cdFx0aWYgKHBhdGgubGVuZ3RoID09PSAwKVxuXHRcdFx0cmV0dXJuIFwiLlwiO1xuXHRcdFxuXHRcdGNvbnN0IGlzQWJzb2x1dGUgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IENoYXIuc2xhc2g7XG5cdFx0Y29uc3QgdHJhaWxpbmdTZXBhcmF0b3IgPSBwYXRoLmNoYXJDb2RlQXQocGF0aC5sZW5ndGggLSAxKSA9PT0gQ2hhci5zbGFzaDtcblx0XHRcblx0XHQvLyBOb3JtYWxpemUgdGhlIHBhdGhcblx0XHRwYXRoID0gbm9ybWFsaXplU3RyaW5nUG9zaXgocGF0aCwgIWlzQWJzb2x1dGUpO1xuXHRcdFxuXHRcdGlmIChwYXRoLmxlbmd0aCA9PT0gMCAmJiAhaXNBYnNvbHV0ZSlcblx0XHRcdHBhdGggPSBcIi5cIjtcblx0XHRcblx0XHRpZiAocGF0aC5sZW5ndGggPiAwICYmIHRyYWlsaW5nU2VwYXJhdG9yKVxuXHRcdFx0cGF0aCArPSBGaWxhLnNlcDtcblx0XHRcblx0XHRpZiAoaXNBYnNvbHV0ZSlcblx0XHRcdHJldHVybiBGaWxhLnNlcCArIHBhdGg7XG5cdFx0XG5cdFx0cmV0dXJuIHBhdGg7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRmdW5jdGlvbiBub3JtYWxpemVTdHJpbmdQb3NpeChwYXRoOiBzdHJpbmcsIGFsbG93QWJvdmVSb290OiBib29sZWFuKVxuXHR7XG5cdFx0bGV0IHJlcyA9IFwiXCI7XG5cdFx0bGV0IGxhc3RTZWdtZW50TGVuZ3RoID0gMDtcblx0XHRsZXQgbGFzdFNsYXNoID0gLTE7XG5cdFx0bGV0IGRvdHMgPSAwO1xuXHRcdGxldCBjb2RlO1xuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDw9IHBhdGgubGVuZ3RoOyArK2kpXG5cdFx0e1xuXHRcdFx0aWYgKGkgPCBwYXRoLmxlbmd0aClcblx0XHRcdFx0Y29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcblx0XHRcdFxuXHRcdFx0ZWxzZSBpZiAoY29kZSA9PT0gQ2hhci5zbGFzaClcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGVsc2Vcblx0XHRcdFx0Y29kZSA9IENoYXIuc2xhc2g7XG5cdFx0XHRcblx0XHRcdGlmIChjb2RlID09PSBDaGFyLnNsYXNoKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAobGFzdFNsYXNoID09PSBpIC0gMSB8fCBkb3RzID09PSAxKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Ly8gTk9PUFxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGxhc3RTbGFzaCAhPT0gaSAtIDEgJiYgZG90cyA9PT0gMilcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChyZXMubGVuZ3RoIDwgMiB8fCBcblx0XHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoICE9PSAyIHx8IFxuXHRcdFx0XHRcdFx0cmVzLmNoYXJDb2RlQXQocmVzLmxlbmd0aCAtIDEpICE9PSBDaGFyLmRvdCB8fFxuXHRcdFx0XHRcdFx0cmVzLmNoYXJDb2RlQXQocmVzLmxlbmd0aCAtIDIpICE9PSBDaGFyLmRvdClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAocmVzLmxlbmd0aCA+IDIpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGxldCBsYXN0U2xhc2hJbmRleCA9IHJlcy5sYXN0SW5kZXhPZihGaWxhLnNlcCk7XG5cdFx0XHRcdFx0XHRcdGlmIChsYXN0U2xhc2hJbmRleCAhPT0gcmVzLmxlbmd0aCAtIDEpXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRpZiAobGFzdFNsYXNoSW5kZXggPT09IC0xKVxuXHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdHJlcyA9IFwiXCI7XG5cdFx0XHRcdFx0XHRcdFx0XHRsYXN0U2VnbWVudExlbmd0aCA9IDA7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXMgPSByZXMuc2xpY2UoMCwgbGFzdFNsYXNoSW5kZXgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0bGFzdFNlZ21lbnRMZW5ndGggPSByZXMubGVuZ3RoIC0gMSAtIHJlcy5sYXN0SW5kZXhPZihGaWxhLnNlcCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGxhc3RTbGFzaCA9IGk7XG5cdFx0XHRcdFx0XHRcdFx0ZG90cyA9IDA7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgaWYgKHJlcy5sZW5ndGggPT09IDIgfHwgcmVzLmxlbmd0aCA9PT0gMSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0cmVzID0gXCJcIjtcblx0XHRcdFx0XHRcdFx0bGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuXHRcdFx0XHRcdFx0XHRsYXN0U2xhc2ggPSBpO1xuXHRcdFx0XHRcdFx0XHRkb3RzID0gMDtcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChhbGxvd0Fib3ZlUm9vdClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAocmVzLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0XHRcdHJlcyArPSBcIi8uLlwiO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRyZXMgPSBcIi4uXCI7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoID0gMjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHJlcy5sZW5ndGggPiAwKVxuXHRcdFx0XHRcdFx0cmVzICs9IEZpbGEuc2VwICsgcGF0aC5zbGljZShsYXN0U2xhc2ggKyAxLCBpKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRyZXMgPSBwYXRoLnNsaWNlKGxhc3RTbGFzaCArIDEsIGkpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoID0gaSAtIGxhc3RTbGFzaCAtIDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGFzdFNsYXNoID0gaTtcblx0XHRcdFx0ZG90cyA9IDA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChjb2RlID09PSBDaGFyLmRvdCAmJiBkb3RzICE9PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0Kytkb3RzO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBkb3RzID0gLTE7XG5cdFx0fVxuXHRcdHJldHVybiByZXM7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZnVuY3Rpb24gcmVsYXRpdmUoZnJvbTogc3RyaW5nIHwgRmlsYSwgdG86IHN0cmluZyB8IEZpbGEpXG5cdHtcblx0XHRpZiAoZnJvbSA9PT0gdG8pXG5cdFx0XHRyZXR1cm4gXCJcIjtcblx0XHRcblx0XHRmcm9tID0gcG9zaXgucmVzb2x2ZShmcm9tIGluc3RhbmNlb2YgRmlsYSA/IGZyb20ucGF0aCA6IGZyb20pO1xuXHRcdHRvID0gcG9zaXgucmVzb2x2ZSh0byBpbnN0YW5jZW9mIEZpbGEgPyB0by5wYXRoIDogdG8pO1xuXHRcdFxuXHRcdGlmIChmcm9tID09PSB0bylcblx0XHRcdHJldHVybiBcIlwiO1xuXHRcdFxuXHRcdC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcblx0XHR2YXIgZnJvbVN0YXJ0ID0gMTtcblx0XHRmb3IgKDsgZnJvbVN0YXJ0IDwgZnJvbS5sZW5ndGg7ICsrZnJvbVN0YXJ0KSBcblx0XHRcdGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0KSAhPT0gNDcgLyovKi8pXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFxuXHRcdHZhciBmcm9tRW5kID0gZnJvbS5sZW5ndGg7XG5cdFx0dmFyIGZyb21MZW4gPSBmcm9tRW5kIC0gZnJvbVN0YXJ0O1xuXHRcdFxuXHRcdC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcblx0XHR2YXIgdG9TdGFydCA9IDE7XG5cdFx0Zm9yICg7IHRvU3RhcnQgPCB0by5sZW5ndGg7ICsrdG9TdGFydClcblx0XHRcdGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpICE9PSA0NyAvKi8qLylcblx0XHRcdFx0YnJlYWs7XG5cdFx0XG5cdFx0dmFyIHRvRW5kID0gdG8ubGVuZ3RoO1xuXHRcdHZhciB0b0xlbiA9IHRvRW5kIC0gdG9TdGFydDtcblx0XHRcblx0XHQvLyBDb21wYXJlIHBhdGhzIHRvIGZpbmQgdGhlIGxvbmdlc3QgY29tbW9uIHBhdGggZnJvbSByb290XG5cdFx0dmFyIGxlbmd0aCA9IGZyb21MZW4gPCB0b0xlbiA/IGZyb21MZW4gOiB0b0xlbjtcblx0XHR2YXIgbGFzdENvbW1vblNlcCA9IC0xO1xuXHRcdHZhciBpID0gMDtcblx0XHRmb3IgKDsgaSA8PSBsZW5ndGg7ICsraSlcblx0XHR7XG5cdFx0XHRpZiAoaSA9PT0gbGVuZ3RoKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAodG9MZW4gPiBsZW5ndGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0ICsgaSkgPT09IDQ3IC8qLyovIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIGV4YWN0IGJhc2UgcGF0aCBmb3IgYHRvYC5cblx0XHRcdFx0XHRcdC8vIEZvciBleGFtcGxlOiBmcm9tPVwiL2Zvby9iYXJcIjsgdG89XCIvZm9vL2Jhci9iYXpcIlxuXHRcdFx0XHRcdFx0cmV0dXJuIHRvLnNsaWNlKHRvU3RhcnQgKyBpICsgMSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKGkgPT09IDApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Ly8gV2UgZ2V0IGhlcmUgaWYgYGZyb21gIGlzIHRoZSByb290XG5cdFx0XHRcdFx0XHQvLyBGb3IgZXhhbXBsZTogZnJvbT1cIi9cIjsgdG89XCIvZm9vXCJcblx0XHRcdFx0XHRcdHJldHVybiB0by5zbGljZSh0b1N0YXJ0ICsgaSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGZyb21MZW4gPiBsZW5ndGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpID09PSA0NyAvKi8qLyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Ly8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgZnJvbWAuXG5cdFx0XHRcdFx0XHQvLyBGb3IgZXhhbXBsZTogZnJvbT1cIi9mb28vYmFyL2JhelwiOyB0bz1cIi9mb28vYmFyXCJcblx0XHRcdFx0XHRcdGxhc3RDb21tb25TZXAgPSBpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChpID09PSAwKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdC8vIFdlIGdldCBoZXJlIGlmIGB0b2AgaXMgdGhlIHJvb3QuXG5cdFx0XHRcdFx0XHQvLyBGb3IgZXhhbXBsZTogZnJvbT1cIi9mb29cIjsgdG89XCIvXCJcblx0XHRcdFx0XHRcdGxhc3RDb21tb25TZXAgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dmFyIGZyb21Db2RlID0gZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpO1xuXHRcdFx0dmFyIHRvQ29kZSA9IHRvLmNoYXJDb2RlQXQodG9TdGFydCArIGkpO1xuXHRcdFx0XG5cdFx0XHRpZiAoZnJvbUNvZGUgIT09IHRvQ29kZSlcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGVsc2UgaWYgKGZyb21Db2RlID09PSA0NyAvKi8qLyApXG5cdFx0XHRcdGxhc3RDb21tb25TZXAgPSBpO1xuXHRcdH1cblx0XHRcblx0XHR2YXIgb3V0ID0gXCJcIjtcblx0XHQvLyBHZW5lcmF0ZSB0aGUgcmVsYXRpdmUgcGF0aCBiYXNlZCBvbiB0aGUgcGF0aCBkaWZmZXJlbmNlIGJldHdlZW4gYHRvYFxuXHRcdC8vIGFuZCBgZnJvbWBcblx0XHRmb3IgKGkgPSBmcm9tU3RhcnQgKyBsYXN0Q29tbW9uU2VwICsgMTsgaSA8PSBmcm9tRW5kOyArK2kpXG5cdFx0e1xuXHRcdFx0aWYgKGkgPT09IGZyb21FbmQgfHwgZnJvbS5jaGFyQ29kZUF0KGkpID09PSA0NyAvKi8qLyApXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChvdXQubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRcdG91dCArPSBcIi4uXCI7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRvdXQgKz0gXCIvLi5cIjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0Ly8gTGFzdGx5LCBhcHBlbmQgdGhlIHJlc3Qgb2YgdGhlIGRlc3RpbmF0aW9uIChgdG9gKSBwYXRoIHRoYXQgY29tZXMgYWZ0ZXJcblx0XHQvLyB0aGUgY29tbW9uIHBhdGggcGFydHNcblx0XHRpZiAob3V0Lmxlbmd0aCA+IDApXG5cdFx0XHRyZXR1cm4gb3V0ICsgdG8uc2xpY2UodG9TdGFydCArIGxhc3RDb21tb25TZXApO1xuXHRcdFxuXHRcdHRvU3RhcnQgKz0gbGFzdENvbW1vblNlcDtcblx0XHRpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0KSA9PT0gNDcgLyovKi8gKVxuXHRcdFx0Kyt0b1N0YXJ0O1xuXHRcdFxuXHRcdHJldHVybiB0by5zbGljZSh0b1N0YXJ0KTtcblx0fVxuXHRcblx0Y29uc3QgcG9zaXggPSB7XG5cdFx0cmVzb2x2ZSguLi5hcmdzOiBzdHJpbmdbXSlcblx0XHR7XG5cdFx0XHR2YXIgcmVzb2x2ZWRQYXRoID0gXCJcIjtcblx0XHRcdHZhciByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cdFx0XHR2YXIgY3dkO1xuXHRcdFx0XG5cdFx0XHRmb3IgKHZhciBpID0gYXJncy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBwYXRoO1xuXHRcdFx0XHRpZiAoaSA+PSAwKVxuXHRcdFx0XHRcdHBhdGggPSBhcmdzW2ldO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoY3dkID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIpXG5cdFx0XHRcdFx0XHRjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHBhdGggPSBjd2Q7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIFNraXAgZW1wdHkgZW50cmllc1xuXHRcdFx0XHRpZiAocGF0aC5sZW5ndGggPT09IDApXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXNvbHZlZFBhdGggPSBwYXRoICsgXCIvXCIgKyByZXNvbHZlZFBhdGg7XG5cdFx0XHRcdHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG5cdFx0XHQvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblx0XHRcdFxuXHRcdFx0Ly8gTm9ybWFsaXplIHRoZSBwYXRoXG5cdFx0XHRyZXNvbHZlZFBhdGggPSBub3JtYWxpemVTdHJpbmdQb3NpeChyZXNvbHZlZFBhdGgsICFyZXNvbHZlZEFic29sdXRlKTtcblx0XHRcdFxuXHRcdFx0aWYgKHJlc29sdmVkQWJzb2x1dGUpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMClcblx0XHRcdFx0XHRyZXR1cm4gXCIvXCIgKyByZXNvbHZlZFBhdGg7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXR1cm4gXCIvXCI7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMClcblx0XHRcdFx0cmV0dXJuIHJlc29sdmVkUGF0aDtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIFwiLlwiO1xuXHRcdH0sXG5cdH07XG5cdFxuXHRkZWNsYXJlIGNvbnN0IHByb2Nlc3M6IGFueTtcblx0XG5cdC8qKiAqL1xuXHRjb25zdCBlbnVtIENoYXJcblx0e1xuXHRcdGRvdCA9IDQ2LFxuXHRcdHNsYXNoID0gNDcsXG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgY29uc3QgZW51bSBFdmVudFxuXHR7XG5cdFx0Y3JlYXRlID0gXCJjcmVhdGVcIixcblx0XHRtb2RpZnkgPSBcIm1vZGlmeVwiLFxuXHRcdGRlbGV0ZSA9IFwiZGVsZXRlXCIsXG5cdH1cbn1cblxuLy9AdHMtaWdub3JlIENvbW1vbkpTIGNvbXBhdGliaWxpdHlcbnR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgT2JqZWN0LmFzc2lnbihtb2R1bGUuZXhwb3J0cywgeyBGaWxhIH0pO1xuXG4vLyBDb21tb25KUyBtb2R1bGUgdHlwaW5nc1xuZGVjbGFyZSBtb2R1bGUgXCJAc3F1YXJlc2FwcC9maWxhXCJcbntcblx0ZXhwb3J0ID0gRmlsYTtcbn1cbiIsIlxuLyoqIEBpbnRlcm5hbCAqL1xuZGVjbGFyZSBjb25zdCBDQVBBQ0lUT1I6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIENBUEFDSVRPUiA9PT0gXCJ1bmRlZmluZWRcIilcblx0T2JqZWN0LmFzc2lnbihnbG9iYWxUaGlzLCB7IENBUEFDSVRPUjogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgKHdpbmRvdyBhcyBhbnkpLkNhcGFjaXRvciAhPT0gXCJ1bmRlZmluZWRcIiB9KTtcblx0XG5cdC8vQHRzLWlnbm9yZVxuXHRpZiAoIUNBUEFDSVRPUikgcmV0dXJuO1xuXHRcblx0LyoqICovXG5cdGNsYXNzIEZpbGFDYXBhY2l0b3IgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGdldCBmcygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZyA9IGdsb2JhbFRoaXMgYXMgYW55O1xuXHRcdFx0Y29uc3QgZnMgPSBnLkNhcGFjaXRvcj8uUGx1Z2lucz8uRmlsZXN5c3RlbTtcblx0XHRcdGlmICghZnMpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkZpbGVzeXN0ZW0gcGx1Z2luIG5vdCBhZGRlZCB0byBDYXBhY2l0b3IuXCIpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZnMgYXMgdHlwZW9mIGltcG9ydChcIkBjYXBhY2l0b3IvZmlsZXN5c3RlbVwiKS5GaWxlc3lzdGVtO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIHRoZSBmdWxseS1xdWFsaWZpZWQgcGF0aCwgaW5jbHVkaW5nIGFueSBmaWxlIG5hbWUgdG8gdGhlXG5cdFx0ICogZmlsZSBzeXN0ZW0gb2JqZWN0IGJlaW5nIHJlcHJlc2VudGVkIGJ5IHRoaXMgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0Z2V0IHBhdGgoKVxuXHRcdHtcblx0XHRcdHJldHVybiBGaWxhLmpvaW4oLi4udGhpcy5maWxhLmNvbXBvbmVudHMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkVGV4dCgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5mcy5yZWFkRmlsZSh7XG5cdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0ZW5jb2Rpbmc6IFwidXRmOFwiIGFzIGFueVxuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiByZXN1bHQuZGF0YSBhcyBzdHJpbmc7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWRCaW5hcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZnMucmVhZEZpbGUoe1xuXHRcdFx0XHQuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksXG5cdFx0XHRcdGVuY29kaW5nOiBcImFzY2lpXCIgYXMgYW55XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Ly8gRG9lcyB0aGlzIHdvcmsgb24gaU9TP1xuXHRcdFx0Y29uc3QgYmxvYiA9IHJlc3VsdC5kYXRhIGFzIEJsb2I7XG5cdFx0XHRjb25zdCBidWZmZXIgPSBhd2FpdCBuZXcgUmVzcG9uc2UoYmxvYikuYXJyYXlCdWZmZXIoKTtcblx0XHRcdHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXHRcdFx0XG5cdFx0XHQvL2NvbnN0IGJhc2U2NCA9IHJlc3VsdC5kYXRhO1xuXHRcdFx0Ly9yZXR1cm4gVWludDhBcnJheS5mcm9tKGF0b2IoYmFzZTY0KSwgYyA9PiBjLmNoYXJDb2RlQXQoMCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmZzLnJlYWRkaXIodGhpcy5nZXREZWZhdWx0T3B0aW9ucygpKTtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmaWxlIG9mIHJlc3VsdC5maWxlcylcblx0XHRcdFx0aWYgKGZpbGUubmFtZSAhPT0gXCIuRFNfU3RvcmVcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKHRoaXMucGF0aCwgZmlsZS5uYW1lIHx8IFwiXCIpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZpbGFzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZVRleHQodGV4dDogc3RyaW5nLCBvcHRpb25zPzogRmlsYS5JV3JpdGVUZXh0T3B0aW9ucylcblx0XHR7XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdXAgPSB0aGlzLmZpbGEudXAoKTtcblx0XHRcdFx0aWYgKCFhd2FpdCB1cC5leGlzdHMoKSlcblx0XHRcdFx0XHRhd2FpdCB1cC53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3Qgd3JpdGVPcHRpb25zID0ge1xuXHRcdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0XHRkYXRhOiB0ZXh0LFxuXHRcdFx0XHRcdGVuY29kaW5nOiBcInV0ZjhcIiBhcyBhbnlcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChvcHRpb25zPy5hcHBlbmQpXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5mcy5hcHBlbmRGaWxlKHdyaXRlT3B0aW9ucyk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmZzLndyaXRlRmlsZSh3cml0ZU9wdGlvbnMpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZSBmYWlsZWQgdG8gcGF0aDogXCIgKyB0aGlzLnBhdGgpO1xuXHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZmlsYS51cCgpLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5hcnJheUJ1ZmZlclRvQmFzZTY0KGFycmF5QnVmZmVyKTtcblx0XHRcdGF3YWl0IHRoaXMuZnMud3JpdGVGaWxlKHtcblx0XHRcdFx0Li4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLFxuXHRcdFx0XHRkYXRhLFxuXHRcdFx0XHRlbmNvZGluZzogXCJhc2NpaVwiIGFzIGFueVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KHIgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtidWZmZXJdLCB7IHR5cGU6IFwiYXBwbGljYXRpb24vb2N0ZXQtYmluYXJ5XCIgfSk7XG5cdFx0XHRcdGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZWFkZXIub25sb2FkID0gZXYgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGRhdGFVcmwgPSAoZXYudGFyZ2V0Py5yZXN1bHQgfHwgXCJcIikgYXMgc3RyaW5nO1xuXHRcdFx0XHRcdGNvbnN0IHNsaWNlID0gZGF0YVVybC5zbGljZShkYXRhVXJsLmluZGV4T2YoYCxgKSArIDEpO1xuXHRcdFx0XHRcdHIoc2xpY2UpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChibG9iKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZURpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5mcy5ta2Rpcih7XG5cdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0cmVjdXJzaXZlOiB0cnVlXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdFx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0YXN5bmMgd3JpdGVTeW1saW5rKGF0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdFx0ICovXG5cdFx0YXN5bmMgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPlxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxFcnJvciB8IHZvaWQ+KGFzeW5jIHIgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGF3YWl0IHRoaXMuZnMucm1kaXIoe1xuXHRcdFx0XHRcdFx0Li4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLFxuXHRcdFx0XHRcdFx0cmVjdXJzaXZlOiB0cnVlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0cigpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0YXdhaXQgdGhpcy5mcy5kZWxldGVGaWxlKHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIG1vdmUodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZC5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGNvcHkodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZyb21PcHRpb25zID0gdGhpcy5nZXREZWZhdWx0T3B0aW9ucygpO1xuXHRcdFx0Y29uc3QgdG9PcHRpb25zID0gdGhpcy5nZXREZWZhdWx0T3B0aW9ucyh0YXJnZXQucGF0aCk7XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMuY29weSh7XG5cdFx0XHRcdGZyb206IGZyb21PcHRpb25zLnBhdGgsXG5cdFx0XHRcdGRpcmVjdG9yeTogZnJvbU9wdGlvbnMuZGlyZWN0b3J5LFxuXHRcdFx0XHR0bzogdG9PcHRpb25zLnBhdGgsXG5cdFx0XHRcdHRvRGlyZWN0b3J5OiB0b09wdGlvbnMuZGlyZWN0b3J5LFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlbmFtZShuZXdOYW1lOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0Y29uc3QgdGFyZ2V0ID0gdGhpcy5maWxhLnVwKCkuZG93bihuZXdOYW1lKS5wYXRoO1xuXHRcdFx0Y29uc3QgZnJvbU9wdGlvbnMgPSB0aGlzLmdldERlZmF1bHRPcHRpb25zKCk7XG5cdFx0XHRjb25zdCB0b09wdGlvbnMgPSB0aGlzLmdldERlZmF1bHRPcHRpb25zKHRhcmdldCk7XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMucmVuYW1lKHtcblx0XHRcdFx0ZnJvbTogdGhpcy5wYXRoLFxuXHRcdFx0XHRkaXJlY3Rvcnk6IGZyb21PcHRpb25zLmRpcmVjdG9yeSxcblx0XHRcdFx0dG86IHRhcmdldCxcblx0XHRcdFx0dG9EaXJlY3Rvcnk6IHRvT3B0aW9ucy5kaXJlY3Rvcnlcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR3YXRjaFByb3RlY3RlZChcblx0XHRcdHJlY3Vyc2l2ZTogYm9vbGVhbixcblx0XHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZCk6ICgpID0+IHZvaWRcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWRcIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGV4aXN0cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuICEhYXdhaXQgdGhpcy5nZXRTdGF0KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRTdGF0KCkpPy5zaXplIHx8IDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldE1vZGlmaWVkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRTdGF0KCkpPy5tdGltZSB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRDcmVhdGVkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRTdGF0KCkpPy5jdGltZSB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRBY2Nlc3NlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgaXNEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRTdGF0KCkpPy50eXBlID09PSBcImRpcmVjdG9yeVwiO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGFzeW5jIGdldFN0YXQoKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5mcy5zdGF0KHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkgeyByZXR1cm4gbnVsbDsgfVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGdldERlZmF1bHRPcHRpb25zKHRhcmdldFBhdGg6IHN0cmluZyA9IHRoaXMucGF0aClcblx0XHR7XG5cdFx0XHRjb25zdCBzbGFzaCA9IHRhcmdldFBhdGguaW5kZXhPZihcIi9cIik7XG5cdFx0XHRsZXQgcGF0aCA9IFwiXCI7XG5cdFx0XHRsZXQgZGlyZWN0b3J5ID0gXCJcIjtcblx0XHRcdFxuXHRcdFx0aWYgKHNsYXNoIDwgMClcblx0XHRcdHtcblx0XHRcdFx0cGF0aCA9IHRhcmdldFBhdGg7XG5cdFx0XHRcdGRpcmVjdG9yeSA9IERpcmVjdG9yeS5jYWNoZSBhcyBhbnkgYXMgVERpcmVjdG9yeTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0cGF0aCA9IHRhcmdldFBhdGguc2xpY2Uoc2xhc2ggKyAxKTtcblx0XHRcdFx0ZGlyZWN0b3J5ID0gdGFyZ2V0UGF0aC5zbGljZSgwLCBzbGFzaCkgYXMgVERpcmVjdG9yeTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3QgcmVzdWx0ID0ge1xuXHRcdFx0XHRwYXRoLFxuXHRcdFx0XHRkaXJlY3Rvcnk6IGRpcmVjdG9yeSBhcyBURGlyZWN0b3J5XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuXHRcblx0XG5cdC8qKiAqL1xuXHRjb25zdCBlbnVtIERpcmVjdG9yeVxuXHR7XG5cdFx0Y2FjaGUgPSBcIkNBQ0hFXCIsXG5cdFx0ZGF0YSA9IFwiREFUQVwiLFxuXHRcdGRvY3VtZW50cyA9IFwiRE9DVU1FTlRTXCIsXG5cdFx0ZXh0ZXJuYWwgPSBcIkVYVEVSTkFMXCIsXG5cdFx0ZXh0ZXJuYWxTdG9yYWdlID0gXCJFWFRFUk5BTF9TVE9SQUdFXCIsXG5cdFx0bGlicmFyeSA9IFwiTElCUkFSWVwiLFxuXHR9XG5cdFxuXHQvKiogKi9cblx0dHlwZSBURGlyZWN0b3J5ID0gaW1wb3J0KFwiQGNhcGFjaXRvci9maWxlc3lzdGVtXCIpLkRpcmVjdG9yeTtcblx0XG5cdGNvbnN0IGN3ZCA9IFwiREFUQVwiO1xuXHRjb25zdCB0bXAgPSBcIkNBQ0hFXCI7XG5cdGNvbnN0IHNlcCA9IFwiL1wiO1xuXHRGaWxhLnNldHVwKEZpbGFDYXBhY2l0b3IsIHNlcCwgY3dkLCB0bXApO1xufSkoKTsiLCJcbm5hbWVzcGFjZSBDb3Zlclxue1xuXHQvKiogKi9cblx0ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvdmVyRmlsYU5vZGUoKVxuXHR7XG5cdFx0Y29uc3QgZmlsYSA9IG5ldyBGaWxhKHByb2Nlc3MuY3dkKCksIFwiRmlsYU5vZGVcIiwgXCIrc2FtcGxlXCIpO1xuXHRcdGNvbnN0IHggPSBmaWxhLmRvd24oXCJ4XCIpO1xuXHRcdGF3YWl0IGZpbGEuaXNEaXJlY3RvcnkoKTtcblx0XHRcblx0XHRmaWxhLndhdGNoKChldiwgZmlsYSkgPT5cblx0XHR7XG5cdFx0XHRjb25zb2xlLmxvZyhldiArIFwiOiBcIiArIGZpbGEucGF0aCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cHJvY2Vzcy5zdGRpbi5yZXN1bWUoKTtcblx0fVxufVxuXG50eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiICYmIE9iamVjdC5hc3NpZ24obW9kdWxlLmV4cG9ydHMsIHsgQ292ZXIgfSk7XG4iLCJcbi8qKiBAaW50ZXJuYWwgKi9cbmRlY2xhcmUgY29uc3QgTk9ERTogYm9vbGVhbjtcblxuKCgpID0+XG57XG5cdGlmICh0eXBlb2YgTk9ERSA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRPYmplY3QuYXNzaWduKGdsb2JhbFRoaXMsIHsgTk9ERTogdHlwZW9mIHByb2Nlc3MgKyB0eXBlb2YgcmVxdWlyZSA9PT0gXCJvYmplY3RmdW5jdGlvblwiIH0pO1xuXHRcblx0Ly9AdHMtaWdub3JlXG5cdGlmICghTk9ERSkgcmV0dXJuO1xuXHRcblx0Y2xhc3MgRmlsYU5vZGUgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIHJlYWRvbmx5IGZzID0gcmVxdWlyZShcImZzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJmc1wiKTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkVGV4dCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuZnMucHJvbWlzZXMucmVhZEZpbGUodGhpcy5maWxhLnBhdGgsIFwidXRmOFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZEJpbmFyeSgpOiBQcm9taXNlPEFycmF5QnVmZmVyPlxuXHRcdHtcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmZzLnByb21pc2VzLnJlYWRGaWxlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZERpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmlsZU5hbWVzID0gYXdhaXQgdGhpcy5mcy5wcm9taXNlcy5yZWFkZGlyKHRoaXMuZmlsYS5wYXRoKTtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlTmFtZXMpXG5cdFx0XHRcdGlmIChmaWxlTmFtZSAhPT0gXCIuRFNfU3RvcmVcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKC4uLnRoaXMuZmlsYS5jb21wb25lbnRzLCBmaWxlTmFtZSkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZmlsYS51cCgpLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRcblx0XHRcdGlmIChvcHRpb25zPy5hcHBlbmQpXG5cdFx0XHRcdGF3YWl0IHRoaXMuZnMucHJvbWlzZXMuYXBwZW5kRmlsZSh0aGlzLmZpbGEucGF0aCwgdGV4dCk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGF3YWl0IHRoaXMuZnMucHJvbWlzZXMud3JpdGVGaWxlKHRoaXMuZmlsYS5wYXRoLCB0ZXh0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZmlsYS51cCgpLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlcik7XG5cdFx0XHRhd2FpdCB0aGlzLmZzLnByb21pc2VzLndyaXRlRmlsZSh0aGlzLmZpbGEucGF0aCwgYnVmZmVyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGlmICghdGhpcy5mcy5leGlzdHNTeW5jKHRoaXMuZmlsYS5wYXRoKSlcblx0XHRcdFx0YXdhaXQgdGhpcy5mcy5wcm9taXNlcy5ta2Rpcih0aGlzLmZpbGEucGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFdyaXRlcyBhIHN5bWxpbmsgZmlsZSBhdCB0aGUgbG9jYXRpb24gcmVwcmVzZW50ZWQgYnkgdGhlIHNwZWNpZmllZFxuXHRcdCAqIEZpbGEgb2JqZWN0LCB0byB0aGUgbG9jYXRpb24gc3BlY2lmaWVkIGJ5IHRoZSBjdXJyZW50IEZpbGEgb2JqZWN0LlxuXHRcdCAqL1xuXHRcdGFzeW5jIHdyaXRlU3ltbGluayhhdDogRmlsYSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8dm9pZD4ociA9PlxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmZzLnN5bWxpbmsoYXQucGF0aCwgdGhpcy5maWxhLnBhdGgsICgpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIERlbGV0ZXMgdGhlIGZpbGUgb3IgZGlyZWN0b3J5IHRoYXQgdGhpcyBGaWxhIG9iamVjdCByZXByZXNlbnRzLlxuXHRcdCAqL1xuXHRcdGFzeW5jIGRlbGV0ZSgpOiBQcm9taXNlPEVycm9yIHwgdm9pZD5cblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8RXJyb3IgfCB2b2lkPihyZXNvbHZlID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmZzLnJtZGlyKHRoaXMuZmlsYS5wYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9LCBlcnJvciA9PlxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJlc29sdmUoZXJyb3IgfHwgdm9pZCAwKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMucHJvbWlzZXMudW5saW5rKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bW92ZSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT5cblx0XHRcdHtcblx0XHRcdFx0dGhpcy5mcy5yZW5hbWUodGhpcy5maWxhLnBhdGgsIHRhcmdldC5wYXRoLCAoKSA9PiByZXNvbHZlKCkpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvcHkodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihhc3luYyByZXNvbHZlID0+XG5cdFx0XHR7XG5cdFx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmZzLmNwKHRoaXMuZmlsYS5wYXRoLCB0YXJnZXQucGF0aCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0sICgpID0+IHJlc29sdmUoKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgZGlyID0gdGFyZ2V0LnVwKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCFhd2FpdCBkaXIuZXhpc3RzKCkpXG5cdFx0XHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZShyID0+IHRoaXMuZnMubWtkaXIoZGlyLnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0sIHIpKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR0aGlzLmZzLmNvcHlGaWxlKHRoaXMuZmlsYS5wYXRoLCB0YXJnZXQucGF0aCwgKCkgPT4gcmVzb2x2ZSgpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHdhdGNoUHJvdGVjdGVkKFxuXHRcdFx0cmVjdXJzaXZlOiBib29sZWFuLFxuXHRcdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhLCBzZWNvbmRhcnlGaWxhPzogRmlsYSkgPT4gdm9pZClcblx0XHR7XG5cdFx0XHRjb25zdCB3YXRjaGVyID0gRmlsYU5vZGUuY2hva2lkYXIud2F0Y2godGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0XG5cdFx0XHR3YXRjaGVyLm9uKFwicmVhZHlcIiwgKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0d2F0Y2hlci5vbihcImFsbFwiLCAoZXZOYW1lLCBwYXRoKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHBhdGguZW5kc1dpdGgoXCIvLkRTX1N0b3JlXCIpKVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGxldCBldjogRmlsYS5FdmVudCB8IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoZXZOYW1lID09PSBcImFkZFwiKVxuXHRcdFx0XHRcdFx0ZXYgPSBGaWxhLkV2ZW50LmNyZWF0ZTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChldk5hbWUgPT09IFwiY2hhbmdlXCIpXG5cdFx0XHRcdFx0XHRldiA9IEZpbGEuRXZlbnQubW9kaWZ5O1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKGV2TmFtZSA9PT0gXCJ1bmxpbmtcIilcblx0XHRcdFx0XHRcdGV2ID0gRmlsYS5FdmVudC5kZWxldGU7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGV2KVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tGbihldiwgbmV3IEZpbGEocGF0aCkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gKCkgPT4geyB3YXRjaGVyLnJlbW92ZUFsbExpc3RlbmVycygpIH07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgc3RhdGljIGdldCBjaG9raWRhcigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX2Nob2tpZGFyIHx8ICh0aGlzLl9jaG9raWRhciA9IHJlcXVpcmUoXCJjaG9raWRhclwiKSk7XG5cdFx0fVxuXHRcdHByaXZhdGUgc3RhdGljIF9jaG9raWRhcjogdHlwZW9mIGltcG9ydChcImNob2tpZGFyXCIpO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlbmFtZShuZXdOYW1lOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuZnMucHJvbWlzZXMucmVuYW1lKHRoaXMuZmlsYS5wYXRoLCB0aGlzLmZpbGEudXAoKS5kb3duKG5ld05hbWUpLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihyID0+XG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZnMuc3RhdCh0aGlzLmZpbGEucGF0aCwgZXJyb3IgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHIoIWVycm9yKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0U2l6ZSgpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFN0YXRzKCk7XG5cdFx0XHRyZXR1cm4gc3RhdHM/LnNpemUgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0TW9kaWZpZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFN0YXRzKCk7XG5cdFx0XHRyZXR1cm4gc3RhdHM/Lm10aW1lTXMgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0Q3JlYXRlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRjb25zdCBzdGF0cyA9IGF3YWl0IHRoaXMuZ2V0U3RhdHMoKTtcblx0XHRcdHJldHVybiBzdGF0cz8uYmlydGh0aW1lTXMgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFN0YXRzKCk7XG5cdFx0XHRyZXR1cm4gc3RhdHM/LmF0aW1lTXMgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgaXNEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXRzID0gYXdhaXQgdGhpcy5nZXRTdGF0cygpO1xuXHRcdFx0cmV0dXJuIHN0YXRzPy5pc0RpcmVjdG9yeSgpIHx8IGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGFzeW5jIGdldFN0YXRzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8aW1wb3J0KFwiZnNcIikuU3RhdHMgfCB1bmRlZmluZWQ+KHIgPT5cblx0XHRcdHtcblx0XHRcdFx0dGhpcy5mcy5zdGF0KHRoaXMuZmlsYS5wYXRoLCAoZXJyb3IsIHN0YXRzKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cihzdGF0cyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cdFxuXHRjb25zdCBzZXAgPSAocmVxdWlyZShcInBhdGhcIikgYXMgdHlwZW9mIGltcG9ydChcInBhdGhcIikpLnNlcDtcblx0Y29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcblx0Y29uc3QgdG1wID0gKHJlcXVpcmUoXCJvc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwib3NcIikpLnRtcGRpcigpO1xuXHRGaWxhLnNldHVwKEZpbGFOb2RlLCBzZXAsIGN3ZCwgdG1wKTtcbn0pKCk7XG4iLCJcbi8qKiBAaW50ZXJuYWwgKi9cbmRlY2xhcmUgY29uc3QgVEFVUkk6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIFRBVVJJID09PSBcInVuZGVmaW5lZFwiKVxuXHRcdE9iamVjdC5hc3NpZ24oZ2xvYmFsVGhpcywgeyBUQVVSSTogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgKGdsb2JhbFRoaXMgYXMgYW55KS5fX1RBVVJJX18gIT09IFwidW5kZWZpbmVkXCIgfSk7XG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKCFUQVVSSSkgcmV0dXJuO1xuXHRcblx0Y2xhc3MgRmlsYVRhdXJpIGV4dGVuZHMgRmlsYS5GaWxhQmFja2VuZFxuXHR7XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSByZWFkb25seSBmczogdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS5mcyA9IFxuXHRcdFx0KGdsb2JhbFRoaXMgYXMgYW55KS5fX1RBVVJJX18uZnM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZFRleHQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmZzLnJlYWRUZXh0RmlsZSh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlYWRCaW5hcnkoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmZzLnJlYWRCaW5hcnlGaWxlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZERpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmlsZU5hbWVzID0gYXdhaXQgdGhpcy5mcy5yZWFkRGlyKHRoaXMuZmlsYS5wYXRoKTtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlTmFtZXMpXG5cdFx0XHRcdGlmIChmaWxlTmFtZS5uYW1lICE9PSBcIi5EU19TdG9yZVwiKVxuXHRcdFx0XHRcdGZpbGFzLnB1c2gobmV3IEZpbGEodGhpcy5maWxhLnBhdGgsIGZpbGVOYW1lLm5hbWUgfHwgXCJcIikpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB1cCA9IHRoaXMuZmlsYS51cCgpO1xuXHRcdFx0XHRpZiAoIWF3YWl0IHVwLmV4aXN0cygpKVxuXHRcdFx0XHRcdGF3YWl0IHVwLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRhd2FpdCB0aGlzLmZzLndyaXRlVGV4dEZpbGUodGhpcy5maWxhLnBhdGgsIHRleHQsIHtcblx0XHRcdFx0XHRhcHBlbmQ6IG9wdGlvbnM/LmFwcGVuZFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKVxuXHRcdFx0e1xuXHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZmlsYS51cCgpLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRhd2FpdCB0aGlzLmZzLndyaXRlQmluYXJ5RmlsZSh0aGlzLmZpbGEucGF0aCwgYXJyYXlCdWZmZXIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZURpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0dGhpcy5mcy5jcmVhdGVEaXIodGhpcy5maWxhLnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBXcml0ZXMgYSBzeW1saW5rIGZpbGUgYXQgdGhlIGxvY2F0aW9uIHJlcHJlc2VudGVkIGJ5IHRoZSBzcGVjaWZpZWRcblx0XHQgKiBGaWxhIG9iamVjdCwgdG8gdGhlIGxvY2F0aW9uIHNwZWNpZmllZCBieSB0aGUgY3VycmVudCBGaWxhIG9iamVjdC5cblx0XHQgKi9cblx0XHRhc3luYyB3cml0ZVN5bWxpbmsoYXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG51bGwgYXMgYW55O1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBEZWxldGVzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSB0aGF0IHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cy5cblx0XHQgKi9cblx0XHRhc3luYyBkZWxldGUoKTogUHJvbWlzZTxFcnJvciB8IHZvaWQ+XG5cdFx0e1xuXHRcdFx0aWYgKGF3YWl0IHRoaXMuaXNEaXJlY3RvcnkoKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPEVycm9yIHwgdm9pZD4oYXN5bmMgcmVzb2x2ZSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5mcy5yZW1vdmVEaXIodGhpcy5maWxhLnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMucmVtb3ZlRmlsZSh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG1vdmUodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHJldHVybiBudWxsIGFzIGFueTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgY29weSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0aWYgKGF3YWl0IHRhcmdldC5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0XHR0aHJvdyBcIkNvcHlpbmcgZGlyZWN0b3JpZXMgaXMgbm90IGltcGxlbWVudGVkLlwiO1xuXHRcdFx0XG5cdFx0XHRhd2FpdCB0aGlzLmZzLmNvcHlGaWxlKHRoaXMuZmlsYS5wYXRoLCB0YXJnZXQucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHdhdGNoUHJvdGVjdGVkKFxuXHRcdFx0cmVjdXJzaXZlOiBib29sZWFuLFxuXHRcdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdGxldCB1bjogRnVuY3Rpb24gfCBudWxsID0gbnVsbDtcblx0XHRcdFxuXHRcdFx0KGFzeW5jICgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdHVuID0gYXdhaXQgd2F0Y2hJbnRlcm5hbCh0aGlzLmZpbGEucGF0aCwge30sIGFzeW5jIGV2ID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoIXVuKVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IHBheWxvYWQgPSBldi5wYXlsb2FkLnBheWxvYWQ7XG5cdFx0XHRcdFx0aWYgKHR5cGVvZiBwYXlsb2FkICE9PSBcInN0cmluZ1wiKVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGNvbnN0IGZpbGEgPSBuZXcgRmlsYShldi5wYXlsb2FkLnBheWxvYWQpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChldi50eXBlID09PSBcIk5vdGljZVdyaXRlXCIgfHwgZXYudHlwZSA9PT0gXCJXcml0ZVwiKVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tGbihGaWxhLkV2ZW50Lm1vZGlmeSwgZmlsYSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZXYudHlwZSA9PT0gXCJOb3RpY2VSZW1vdmVcIiB8fCBldi50eXBlID09PSBcIlJlbW92ZVwiKVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tGbihGaWxhLkV2ZW50LmRlbGV0ZSwgZmlsYSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZXYudHlwZSA9PT0gXCJDcmVhdGVcIiB8fCBldi50eXBlID09PSBcIlJlbmFtZVwiKVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tGbihGaWxhLkV2ZW50Lm1vZGlmeSwgZmlsYSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSkoKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuICgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdC8vIFRoaXMgaXMgaGFja3kuLi4gdGhlIGludGVyZmFjZSBleHBlY3RzIGEgZnVuY3Rpb24gdG8gYmVcblx0XHRcdFx0Ly8gcmV0dXJuZWQgcmF0aGVyIHRoYW4gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gb25lLFxuXHRcdFx0XHQvLyBzbyB0aGlzIHdhaXRzIDEwMG1zIHRvIGNhbGwgdGhlIHVuKCkgZnVuY3Rpb24gaWYgdGhpcyB1bndhdGNoXG5cdFx0XHRcdC8vIGZ1bmN0aW9uIGlzIGludm9rZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgY2FsbGluZyB3YXRjaCgpLlxuXHRcdFx0XHRpZiAodW4pXG5cdFx0XHRcdFx0dW4oKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4gdW4/LigpLCAxMDApO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVuYW1lKG5ld05hbWU6IHN0cmluZylcblx0XHR7XG5cdFx0XHQvLyBOb3RlIHRoYXQgdGhlIFwicmVuYW1lRmlsZVwiIG1ldGhvZCBhY3R1YWxseSB3b3JrcyBvbiBkaXJlY3Rvcmllc1xuXHRcdFx0cmV0dXJuIHRoaXMuZnMucmVuYW1lRmlsZSh0aGlzLmZpbGEucGF0aCwgdGhpcy5maWxhLnVwKCkuZG93bihuZXdOYW1lKS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZXhpc3RzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5mcy5leGlzdHModGhpcy5maWxhLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRTaXplKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0TWV0YSgpKS5zaXplO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRNb2RpZmllZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0TWV0YSgpKS5tb2RpZmllZEF0O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRDcmVhdGVkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRNZXRhKCkpLmNyZWF0ZWRBdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldE1ldGEoKSkuYWNjZXNzZWRBdDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgaXNEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRNZXRhKCkpLmlzRGlyO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGFzeW5jIGdldE1ldGEoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLl9tZXRhIHx8ICh0aGlzLl9tZXRhID0gYXdhaXQgZ2V0TWV0YWRhdGEodGhpcy5maWxhLnBhdGgpKTtcblx0XHR9XG5cdFx0cHJpdmF0ZSBfbWV0YTogTWV0YWRhdGEgfCBudWxsID0gbnVsbDtcblx0fVxuXHRcblx0Y29uc3QgdCA9IChnbG9iYWxUaGlzIGFzIGFueSkuX19UQVVSSV9fO1xuXHRjb25zdCB0YXVyaTogdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS50YXVyaSA9IHQudGF1cmk7XG5cdGNvbnN0IHdpbmQ6IHR5cGVvZiBpbXBvcnQoXCJAdGF1cmktYXBwcy9hcGlcIikud2luZG93ID0gdC53aW5kb3c7XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRhc3luYyBmdW5jdGlvbiB1bndhdGNoKGlkOiBhbnkpXG5cdHtcblx0XHRhd2FpdCB0YXVyaS5pbnZva2UoJ3BsdWdpbjpmcy13YXRjaHx1bndhdGNoJywgeyBpZCB9KTtcblx0fVxuXG5cdC8qKiBAaW50ZXJuYWwgKi9cblx0YXN5bmMgZnVuY3Rpb24gd2F0Y2hJbnRlcm5hbChcblx0XHRwYXRoczogc3RyaW5nIHwgc3RyaW5nW10sXG5cdFx0b3B0aW9uczogRGVib3VuY2VkV2F0Y2hPcHRpb25zLFxuXHRcdGNhbGxiYWNrRm46IChldmVudDogVGF1cmlXYXRjaEV2ZW50KSA9PiB2b2lkKTogUHJvbWlzZTwoKSA9PiBQcm9taXNlPHZvaWQ+PlxuXHR7XG5cdFx0Y29uc3Qgb3B0cyA9IHtcblx0XHRcdHJlY3Vyc2l2ZTogZmFsc2UsXG5cdFx0XHRkZWxheU1zOiAyMDAwLFxuXHRcdFx0Li4ub3B0aW9ucyxcblx0XHR9O1xuXHRcdFxuXHRcdGxldCB3YXRjaFBhdGhzO1xuXHRcdGlmICh0eXBlb2YgcGF0aHMgPT09IFwic3RyaW5nXCIpXG5cdFx0XHR3YXRjaFBhdGhzID0gW3BhdGhzXTtcblx0XHRlbHNlXG5cdFx0XHR3YXRjaFBhdGhzID0gcGF0aHM7XG5cdFx0XG5cdFx0Y29uc3QgaWQgPSB3aW5kb3cuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhuZXcgVWludDMyQXJyYXkoMSkpWzBdO1xuXHRcdGF3YWl0IHRhdXJpLmludm9rZShcInBsdWdpbjpmcy13YXRjaHx3YXRjaFwiLCB7XG5cdFx0XHRpZCxcblx0XHRcdHBhdGhzOiB3YXRjaFBhdGhzLFxuXHRcdFx0b3B0aW9uczogb3B0cyxcblx0XHR9KTtcblx0XHRcblx0XHRjb25zdCB1bmxpc3RlbiA9IGF3YWl0IHdpbmQuYXBwV2luZG93Lmxpc3Rlbihcblx0XHRcdGB3YXRjaGVyOi8vcmF3LWV2ZW50LyR7aWR9YCxcblx0XHRcdGV2ZW50ID0+XG5cdFx0e1xuXHRcdFx0Y2FsbGJhY2tGbihldmVudCBhcyBUYXVyaVdhdGNoRXZlbnQpO1xuXHRcdH0pO1xuXHRcdFxuXHRcdHJldHVybiBhc3luYyAoKSA9PlxuXHRcdHtcblx0XHRcdGF3YWl0IHVud2F0Y2goaWQpO1xuXHRcdFx0dW5saXN0ZW4oKTtcblx0XHR9O1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRhc3luYyBmdW5jdGlvbiB3YXRjaEltbWVkaWF0ZShcblx0XHRwYXRoczogc3RyaW5nIHwgc3RyaW5nW10sXG5cdFx0b3B0aW9uczogRGVib3VuY2VkV2F0Y2hPcHRpb25zLFxuXHRcdGNhbGxiYWNrRm46IChldmVudDogVGF1cmlXYXRjaEV2ZW50KSA9PiB2b2lkKTogUHJvbWlzZTwoKSA9PiBQcm9taXNlPHZvaWQ+PlxuXHR7XG5cdFx0Y29uc3Qgb3B0cyA9IHtcblx0XHRcdHJlY3Vyc2l2ZTogZmFsc2UsXG5cdFx0XHQuLi5vcHRpb25zLFxuXHRcdFx0ZGVsYXlNczogbnVsbFxuXHRcdH07XG5cdFx0XG5cdFx0Y29uc3Qgd2F0Y2hQYXRocyA9IHR5cGVvZiBwYXRocyA9PT0gXCJzdHJpbmdcIiA/IFtwYXRoc10gOiBwYXRocztcblx0XHRjb25zdCBpZCA9IHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50MzJBcnJheSgxKSlbMF07XG5cdFx0XG5cdFx0YXdhaXQgdGF1cmkuaW52b2tlKFwicGx1Z2luOmZzLXdhdGNofHdhdGNoXCIsIHtcblx0XHRcdGlkLFxuXHRcdFx0cGF0aHM6IHdhdGNoUGF0aHMsXG5cdFx0XHRvcHRpb25zOiBvcHRzLFxuXHRcdH0pO1xuXHRcdFxuXHRcdGNvbnN0IHVubGlzdGVuID0gYXdhaXQgd2luZC5hcHBXaW5kb3cubGlzdGVuKFxuXHRcdFx0YHdhdGNoZXI6Ly9yYXctZXZlbnQvJHtpZH1gLFxuXHRcdFx0ZXZlbnQgPT5cblx0XHR7XG5cdFx0XHRjYWxsYmFja0ZuKGV2ZW50IGFzIFRhdXJpV2F0Y2hFdmVudCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIGFzeW5jICgpID0+XG5cdFx0e1xuXHRcdFx0YXdhaXQgdW53YXRjaChpZCk7XG5cdFx0XHR1bmxpc3RlbigpO1xuXHRcdH07XG5cdH1cblxuXHQvKiogKi9cblx0aW50ZXJmYWNlIFRhdXJpV2F0Y2hFdmVudFxuXHR7XG5cdFx0LyoqIEV4YW1wbGU6IFwid2F0Y2hlcjovL2RlYm91bmNlZC1ldmVudC8yOTAzMDMyXCIgKi9cblx0XHRyZWFkb25seSBldmVudDogc3RyaW5nO1xuXHRcdC8qKiBFeGFtcGxlOiBcIm1haW5cIiAqL1xuXHRcdHJlYWRvbmx5IHdpbmRvd0xhYmVsOiBzdHJpbmc7XG5cdFx0LyoqIEV4YW1wbGU6IC9Vc2Vycy91c2VyL0xpYnJhcnkvQXBwbGljYXRpb24gU3VwcG9ydC9jb20uYXBwL2ZpbGVuYW1lLnR4dCAqL1xuXHRcdHJlYWRvbmx5IHBheWxvYWQ6IHsgcGF5bG9hZDogc3RyaW5nOyB9O1xuXHRcdC8qKiAqL1xuXHRcdHJlYWRvbmx5IHR5cGU6IFxuXHRcdFx0XCJOb3RpY2VXcml0ZVwiIHxcblx0XHRcdFwiTm90aWNlUmVtb3ZlXCIgfFxuXHRcdFx0XCJDcmVhdGVcIiB8XG5cdFx0XHRcIldyaXRlXCIgfFxuXHRcdFx0XCJDaG1vZFwiIHxcblx0XHRcdFwiUmVtb3ZlXCIgfFxuXHRcdFx0XCJSZW5hbWVcIiB8XG5cdFx0XHRcIlJlc2NhblwiIHxcblx0XHRcdFwiRXJyb3JcIjtcblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWFkb25seSBpZDogbnVtYmVyO1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRpbnRlcmZhY2UgV2F0Y2hPcHRpb25zXG5cdHtcblx0XHRyZWN1cnNpdmU/OiBib29sZWFuO1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRpbnRlcmZhY2UgRGVib3VuY2VkV2F0Y2hPcHRpb25zIGV4dGVuZHMgV2F0Y2hPcHRpb25zXG5cdHtcblx0XHRkZWxheU1zPzogbnVtYmVyO1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRmdW5jdGlvbiBnZXRNZXRhZGF0YShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPE1ldGFkYXRhPlxuXHR7XG5cdFx0cmV0dXJuIHRhdXJpLmludm9rZShcInBsdWdpbjpmcy1leHRyYXxtZXRhZGF0YVwiLCB7IHBhdGggfSk7XG5cdH1cblxuXHQvKipcblx0ICogTWV0YWRhdGEgaW5mb3JtYXRpb24gYWJvdXQgYSBmaWxlLlxuXHQgKiBUaGlzIHN0cnVjdHVyZSBpcyByZXR1cm5lZCBmcm9tIHRoZSBgbWV0YWRhdGFgIGZ1bmN0aW9uIG9yIG1ldGhvZFxuXHQgKiBhbmQgcmVwcmVzZW50cyBrbm93biBtZXRhZGF0YSBhYm91dCBhIGZpbGUgc3VjaCBhcyBpdHMgcGVybWlzc2lvbnMsXG5cdCAqIHNpemUsIG1vZGlmaWNhdGlvbiB0aW1lcywgZXRjLlxuXHQgKi9cblx0aW50ZXJmYWNlIE1ldGFkYXRhXG5cdHtcblx0XHQvKipcblx0XHQgKiBUaGUgbGFzdCBhY2Nlc3MgdGltZSBvZiB0aGlzIG1ldGFkYXRhLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGFjY2Vzc2VkQXQ6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgY3JlYXRpb24gdGltZSBsaXN0ZWQgaW4gdGhpcyBtZXRhZGF0YS5cblx0XHQgKi9cblx0XHRyZWFkb25seSBjcmVhdGVkQXQ6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgbGFzdCBtb2RpZmljYXRpb24gdGltZSBsaXN0ZWQgaW4gdGhpcyBtZXRhZGF0YS5cblx0XHQgKi9cblx0XHRyZWFkb25seSBtb2RpZmllZEF0OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogYHRydWVgIGlmIHRoaXMgbWV0YWRhdGEgaXMgZm9yIGEgZGlyZWN0b3J5LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGlzRGlyOiBib29sZWFuO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIGB0cnVlYCBpZiB0aGlzIG1ldGFkYXRhIGlzIGZvciBhIHJlZ3VsYXIgZmlsZS5cblx0XHQgKi9cblx0XHRyZWFkb25seSBpc0ZpbGU6IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogYHRydWVgIGlmIHRoaXMgbWV0YWRhdGEgaXMgZm9yIGEgc3ltYm9saWMgbGluay5cblx0XHQgKi9cblx0XHRyZWFkb25seSBpc1N5bWxpbms6IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIHNpemUgb2YgdGhlIGZpbGUsIGluIGJ5dGVzLCB0aGlzIG1ldGFkYXRhIGlzIGZvci5cblx0XHQgKi9cblx0XHRyZWFkb25seSBzaXplOiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIHBlcm1pc3Npb25zIG9mIHRoZSBmaWxlIHRoaXMgbWV0YWRhdGEgaXMgZm9yLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IHBlcm1pc3Npb25zOiBQZXJtaXNzaW9ucztcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgSUQgb2YgdGhlIGRldmljZSBjb250YWluaW5nIHRoZSBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGRldj86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgaW5vZGUgbnVtYmVyLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGlubz86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgcmlnaHRzIGFwcGxpZWQgdG8gdGhpcyBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IG1vZGU/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIG51bWJlciBvZiBoYXJkIGxpbmtzIHBvaW50aW5nIHRvIHRoaXMgZmlsZS4gT25seSBhdmFpbGFibGUgb24gVW5peC5cblx0XHQgKi9cblx0XHRyZWFkb25seSBubGluaz86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgdXNlciBJRCBvZiB0aGUgb3duZXIgb2YgdGhpcyBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IHVpZD86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgZ3JvdXAgSUQgb2YgdGhlIG93bmVyIG9mIHRoaXMgZmlsZS4gT25seSBhdmFpbGFibGUgb24gVW5peC5cblx0XHQgKi9cblx0XHRyZWFkb25seSBnaWQ/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIGRldmljZSBJRCBvZiB0aGlzIGZpbGUgKGlmIGl0IGlzIGEgc3BlY2lhbCBvbmUpLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IHJkZXY/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIGJsb2NrIHNpemUgZm9yIGZpbGVzeXN0ZW0gSS9PLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGJsa3NpemU/OiBudW1iZXI7XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogVGhlIG51bWJlciBvZiBibG9ja3MgYWxsb2NhdGVkIHRvIHRoZSBmaWxlLCBpbiA1MTItYnl0ZSB1bml0cy4gT25seSBhdmFpbGFibGUgb24gVW5peC5cblx0XHQgKi9cblx0XHRyZWFkb25seSBibG9ja3M/OiBudW1iZXI7XG5cdH1cblxuXHQvKiogKi9cblx0aW50ZXJmYWNlIFBlcm1pc3Npb25zXG5cdHtcblx0XHQvKipcblx0XHQgKiBgdHJ1ZWAgaWYgdGhlc2UgcGVybWlzc2lvbnMgZGVzY3JpYmUgYSByZWFkb25seSAodW53cml0YWJsZSkgZmlsZS5cblx0XHQgKi9cblx0XHRyZWFkb25seTogYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgdW5kZXJseWluZyByYXcgYHN0X21vZGVgIGJpdHMgdGhhdCBjb250YWluIHRoZSBzdGFuZGFyZCBVbml4XG5cdFx0ICogcGVybWlzc2lvbnMgZm9yIHRoaXMgZmlsZS5cblx0XHQgKi9cblx0XHRtb2RlPzogbnVtYmVyO1xuXHR9XG5cdFx0XG5cdHtcblx0XHRsZXQgcGF0aDogdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS5wYXRoIHwgbnVsbCA9IG51bGw7XG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0cGF0aCA9IChnbG9iYWxUaGlzIGFzIGFueSkuX19UQVVSSV9fLnBhdGggYXMgdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS5wYXRoO1xuXHRcdH1cblx0XHRjYXRjaCAoZSlcblx0XHR7XG5cdFx0XHRjb25zb2xlLmxvZyhcIndpdGhHbG9iYWxUYXVyaSBpcyBub3Qgc2V0XCIpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRcblx0XHRjb25zdCBzZXAgPSBwYXRoPy5zZXAgfHwgXCIvXCI7XG5cdFx0Y29uc3QgY3dkID0gXCIvXCI7XG5cdFx0Y29uc3QgdG1wID0gXCIvXCI7XG5cdFx0RmlsYS5zZXR1cChGaWxhVGF1cmksIHNlcCwgY3dkLCB0bXApO1xuXHRcdFxuXHRcdChhc3luYyAoKSA9PlxuXHRcdHtcblx0XHRcdC8vIFRoaXMgaXMgYSBodWdlIGhhY2suLi4gYnV0IHdpdGhvdXQgdGhpcywgdGhlIHNldHVwIG5lZWRzXG5cdFx0XHQvLyBzb21lIGFzeW5jIHdoaWNoIG1lYW5zIHRoYXQgaXQgY2FuJ3QgYmUgZG9uZVxuXHRcdFx0Y29uc3QgdG1wID0gYXdhaXQgcGF0aC5hcHBDYWNoZURpcigpO1xuXHRcdFx0RmlsYS5zZXR1cChGaWxhVGF1cmksIHNlcCwgY3dkLCB0bXApO1xuXHRcdH0pKCk7XG5cdH1cbn0pKCk7XG4iLCJcbm5hbWVzcGFjZSBDb3Zlclxue1xuXHQvKiogKi9cblx0ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvdmVyRmlsYVdlYigpXG5cdHtcblx0XHRjb25zdCBkaXIgPSBuZXcgRmlsYShcImRpclwiKTtcblx0XHRkaXIud3JpdGVEaXJlY3RvcnkoKTtcblx0XHRcblx0XHRjb25zdCBmaWxhVGV4dCA9IGRpci5kb3duKFwiZmlsZS50eHRcIik7XG5cdFx0YXdhaXQgZmlsYVRleHQud3JpdGVUZXh0KFwieWF5IVwiKTtcblx0XHRcblx0XHRjb25zdCBmaWxhQmluYXJ5ID0gZGlyLmRvd24oXCJmaWxlLmJpblwiKTtcblx0XHRjb25zdCBidWZmZXIgPSBuZXcgVWludDhBcnJheShbMCwgMSwgMl0pO1xuXHRcdGF3YWl0IGZpbGFCaW5hcnkud3JpdGVCaW5hcnkoYnVmZmVyKTtcblx0XHRcblx0XHRjb25zdCBjb250ZW50cyA9IGF3YWl0IGRpci5yZWFkRGlyZWN0b3J5KCk7XG5cdFx0Zm9yIChjb25zdCBmaWxhIG9mIGNvbnRlbnRzKVxuXHRcdFx0Y29uc29sZS5sb2coZmlsYS5wYXRoKTtcblx0XHRcblx0XHRhd2FpdCBkaXIuZGVsZXRlKCk7XG5cdFx0ZGVidWdnZXI7XG5cdH1cblx0XG5cdGRlY2xhcmUgY29uc3QgbW9kdWxlOiBhbnk7XG5cdHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgT2JqZWN0LmFzc2lnbihtb2R1bGUuZXhwb3J0cywgeyBDb3ZlciB9KTtcbn1cbiIsIlxuLyoqIEBpbnRlcm5hbCAqL1xuZGVjbGFyZSBjb25zdCBXRUI6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIFdFQiA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRPYmplY3QuYXNzaWduKGdsb2JhbFRoaXMsIHsgV0VCOiAhTk9ERSAmJiAhQ0FQQUNJVE9SICYmICFUQVVSSSAmJiB0eXBlb2YgaW5kZXhlZERCID09PSBcIm9iamVjdFwiIH0pXG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKCFXRUIpIHJldHVybjtcblx0XG5cdHR5cGUgS2V5dmEgPSB0eXBlb2YgaW1wb3J0KFwia2V5dmFqc1wiKTtcblx0XG5cdGNsYXNzIEZpbGFXZWIgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogQGludGVybmFsICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMga2V5dmE6IEtleXZhO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKGZpbGE6IEZpbGEpXG5cdFx0e1xuXHRcdFx0c3VwZXIoZmlsYSk7XG5cdFx0XHRGaWxhV2ViLmtleXZhIHx8PSBuZXcgS2V5dmEoeyBuYW1lOiBcImZpbGFcIiB9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZFRleHQoKVxuXHRcdHtcblx0XHRcdHJldHVybiBhd2FpdCBGaWxhV2ViLmtleXZhLmdldDxzdHJpbmc+KHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZEJpbmFyeSgpOiBQcm9taXNlPEFycmF5QnVmZmVyPlxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0cmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgP1xuXHRcdFx0XHR2YWx1ZSA6XG5cdFx0XHRcdG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWREaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdGNvbnN0IHJhbmdlID0gS2V5dmEucHJlZml4KHRoaXMuZmlsYS5wYXRoICsgXCIvXCIpO1xuXHRcdFx0Y29uc3QgY29udGVudHMgPSBhd2FpdCBGaWxhV2ViLmtleXZhLmVhY2goeyByYW5nZSB9LCBcImtleXNcIik7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qga2V5IG9mIGNvbnRlbnRzKVxuXHRcdFx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKGtleSkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdGxldCBjdXJyZW50ID0gdGhpcy5maWxhLnVwKCk7XG5cdFx0XHRjb25zdCBtaXNzaW5nRm9sZGVyczogRmlsYVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoOzspXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChhd2FpdCBjdXJyZW50LmV4aXN0cygpKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0bWlzc2luZ0ZvbGRlcnMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChjdXJyZW50LnVwKCkucGF0aCA9PT0gY3VycmVudC5wYXRoKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQudXAoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmb2xkZXIgb2YgbWlzc2luZ0ZvbGRlcnMpXG5cdFx0XHRcdGF3YWl0IGZvbGRlci53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0XG5cdFx0XHRpZiAob3B0aW9ucz8uYXBwZW5kKVxuXHRcdFx0XHR0ZXh0ID0gKFwiXCIgKyAoYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpIHx8IFwiXCIpKSArIHRleHQ7XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCB0ZXh0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCBhcnJheUJ1ZmZlcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGlmIChhd2FpdCB0aGlzLmV4aXN0cygpKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBIGZpbGUgYWxyZWFkeSBleGlzdHMgYXQgdGhpcyBsb2NhdGlvbi5cIik7XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCBudWxsKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdFx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0YXN5bmMgd3JpdGVTeW1saW5rKGF0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdFx0ICovXG5cdFx0YXN5bmMgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPlxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJhbmdlID0gS2V5dmEucHJlZml4KHRoaXMuZmlsYS5wYXRoICsgXCIvXCIpO1xuXHRcdFx0XHRhd2FpdCBGaWxhV2ViLmtleXZhLmRlbGV0ZShyYW5nZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuZGVsZXRlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgbW92ZSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgY29weSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0d2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sXG5cdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEsIHNlY29uZGFyeUZpbGE/OiBGaWxhKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHRcdHJldHVybiAoKSA9PiB7fTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVuYW1lKG5ld05hbWU6IHN0cmluZylcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0cmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRNb2RpZmllZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0Q3JlYXRlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGlzRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpID09PSBudWxsO1xuXHRcdH1cblx0fVxuXHRcblx0RmlsYS5zZXR1cChGaWxhV2ViLCBcIi9cIiwgXCIvXCIsIFwiL19fdGVtcC9cIik7XG59KSgpOyJdfQ==