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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2ZpbGEvRmlsYS50cyIsIi4uL2ZpbGEtY2FwYWNpdG9yL0ZpbGFDYXBhY2l0b3IudHMiLCIuLi9maWxhLW5vZGUvRmlsYU5vZGUudHMiLCIuLi9maWxhLXRhdXJpL0ZpbGFUYXVyaS50cyIsIi4uL2ZpbGEtd2ViL0ZpbGFXZWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE1BQU0sSUFBSTtJQUVUOzs7T0FHRztJQUNILE1BQU0sQ0FBVSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEVBQUU7UUFFbkMsTUFBZSxXQUFXO1lBRU07WUFBL0IsWUFBK0IsSUFBVTtnQkFBVixTQUFJLEdBQUosSUFBSSxDQUFNO1lBQUksQ0FBQztTQXdCOUM7UUFFRCxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDLENBQUMsRUFBRSxDQUFDO0lBRUw7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBZ0MsRUFBRSxHQUFXLEVBQUUsR0FBVyxFQUFFLElBQVk7UUFFcEYsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSyxDQUFDO0lBQ3pCLENBQUM7SUFFTyxNQUFNLENBQUMsT0FBTyxDQUEwQjtJQUVoRDs7T0FFRztJQUNILE1BQU0sS0FBSyxHQUFHO1FBRWIsT0FBTyxJQUFJLENBQUMsSUFBa0IsQ0FBQztJQUNoQyxDQUFDO0lBQ08sTUFBTSxDQUFDLElBQUksR0FBVyxHQUFHLENBQUM7SUFFbEM7O09BRUc7SUFDSCxNQUFNLEtBQUssR0FBRztRQUViLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7WUFDaEMsT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxD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Q29udGVudCI6WyJcbmNsYXNzIEZpbGFcbntcblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKiBBYnN0cmFjdCBjbGFzcyB0aGF0IG11c3QgYmUgaW1wbGVtZW50ZWQgYnkgRmlsYSBiYWNrZW5kcy5cblx0ICovXG5cdHN0YXRpYyByZWFkb25seSBGaWxhQmFja2VuZCA9ICgoKSA9PlxuXHR7XG5cdFx0YWJzdHJhY3QgY2xhc3MgRmlsYUJhY2tlbmRcblx0XHR7XG5cdFx0XHRjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgcmVhZG9ubHkgZmlsYTogRmlsYSkgeyB9XG5cdFx0XHRcblx0XHRcdGFic3RyYWN0IHJlYWRUZXh0KCk6IFByb21pc2U8c3RyaW5nPjtcblx0XHRcdGFic3RyYWN0IHJlYWRCaW5hcnkoKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj47XG5cdFx0XHRhYnN0cmFjdCByZWFkRGlyZWN0b3J5KCk6IFByb21pc2U8RmlsYVtdPjtcblx0XHRcdGFic3RyYWN0IHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdGFic3RyYWN0IHdyaXRlQmluYXJ5KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3Qgd3JpdGVEaXJlY3RvcnkoKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdGFic3RyYWN0IHdyaXRlU3ltbGluayhhdDogRmlsYSk6IFByb21pc2U8dm9pZD47XG5cdFx0XHRhYnN0cmFjdCBkZWxldGUoKTogUHJvbWlzZTxFcnJvciB8IHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3QgbW92ZSh0YXJnZXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3QgY29weSh0YXJnZXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0XG5cdFx0XHRhYnN0cmFjdCB3YXRjaFByb3RlY3RlZChcblx0XHRcdFx0cmVjdXJzaXZlOiBib29sZWFuLCBcblx0XHRcdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKTogKCkgPT4gdm9pZDtcblx0XHRcdFxuXHRcdFx0YWJzdHJhY3QgcmVuYW1lKG5ld05hbWU6IHN0cmluZyk6IFByb21pc2U8dm9pZD47XG5cdFx0XHRhYnN0cmFjdCBleGlzdHMoKTogUHJvbWlzZTxib29sZWFuPjtcblx0XHRcdGFic3RyYWN0IGdldFNpemUoKTogUHJvbWlzZTxudW1iZXI+O1xuXHRcdFx0YWJzdHJhY3QgZ2V0TW9kaWZpZWRUaWNrcygpOiBQcm9taXNlPG51bWJlcj47XG5cdFx0XHRhYnN0cmFjdCBnZXRDcmVhdGVkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+O1xuXHRcdFx0YWJzdHJhY3QgZ2V0QWNjZXNzZWRUaWNrcygpOiBQcm9taXNlPG51bWJlcj47XG5cdFx0XHRhYnN0cmFjdCBpc0RpcmVjdG9yeSgpOiBQcm9taXNlPGJvb2xlYW4+O1xuXHRcdH1cblx0XHRcblx0XHRyZXR1cm4gRmlsYUJhY2tlbmQ7XG5cdH0pKCk7XG5cdFxuXHQvKipcblx0ICogQGludGVybmFsXG5cdCAqIEVhY2ggYmFja2VuZCBjYWxscyB0aGlzIG1ldGhvZCB0byBwZXJmb3JtIHRoZSBzZXR1cCBmdW5jdGlvbnMuXG5cdCAqIFRoaXMgaXMgdGhlIGludGVybmFsIC5zZXR1cCgpIG92ZXJsb2FkIHRoYXQgaXMgY2FsbGVkIGJ5IGVhY2ggaW1wbGVtZW50b3IuXG5cdCAqL1xuXHRzdGF0aWMgc2V0dXAoYmFja2VuZDogdHlwZW9mIEZpbGEuRmlsYUJhY2tlbmQsIHNlcDogc3RyaW5nLCBjd2Q6IHN0cmluZywgdGVtcDogc3RyaW5nKVxuXHR7XG5cdFx0dGhpcy5iYWNrZW5kID0gYmFja2VuZDtcblx0XHR0aGlzLl9zZXAgPSBzZXAgfHwgXCIvXCI7XG5cdFx0dGhpcy5fY3dkID0gY3dkITtcblx0XHR0aGlzLl90ZW1wb3JhcnkgPSB0ZW1wITtcblx0fVxuXHRcblx0cHJpdmF0ZSBzdGF0aWMgYmFja2VuZDogdHlwZW9mIEZpbGEuRmlsYUJhY2tlbmQ7XG5cdFxuXHQvKipcblx0ICogUGF0aCBzZXBhcmF0b3IuXG5cdCAqL1xuXHRzdGF0aWMgZ2V0IHNlcCgpXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5fc2VwIGFzIFwiXFxcXFwiIHwgXCIvXCI7XG5cdH1cblx0cHJpdmF0ZSBzdGF0aWMgX3NlcDogc3RyaW5nID0gXCIvXCI7XG5cdFxuXHQvKipcblx0ICogR2V0cyB0aGUgY3VycmVudCB3b3JraW5nIGRpcmVjdG9yeSBvZiB0aGUgcHJvY2Vzcy5cblx0ICovXG5cdHN0YXRpYyBnZXQgY3dkKClcblx0e1xuXHRcdGlmICh0eXBlb2YgdGhpcy5fY3dkID09PSBcInN0cmluZ1wiKVxuXHRcdFx0cmV0dXJuIHRoaXMuX2N3ZCA9IG5ldyBGaWxhKHRoaXMuX2N3ZCk7XG5cdFx0XG5cdFx0cmV0dXJuIHRoaXMuX2N3ZDtcblx0fVxuXHRwcml2YXRlIHN0YXRpYyBfY3dkOiBGaWxhIHwgc3RyaW5nID0gXCJcIjtcblx0XG5cdC8qKlxuXHQgKiBcblx0ICovXG5cdHN0YXRpYyBnZXQgdGVtcG9yYXJ5KClcblx0e1xuXHRcdGlmICh0eXBlb2YgdGhpcy5fdGVtcG9yYXJ5ID09PSBcInN0cmluZ1wiKVxuXHRcdFx0cmV0dXJuIHRoaXMuX3RlbXBvcmFyeSA9IG5ldyBGaWxhKHRoaXMuX3RlbXBvcmFyeSk7XG5cdFx0XG5cdFx0cmV0dXJuIHRoaXMuX3RlbXBvcmFyeTtcblx0fVxuXHRwcml2YXRlIHN0YXRpYyBfdGVtcG9yYXJ5OiBGaWxhIHwgc3RyaW5nID0gXCJcIjtcblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgRmlsYSBpbnN0YW5jZSBmcm9tIHRoZSBzcGVjaWZpZWQgcGF0aCBpbiB0aGUgY2FzZSB3aGVuXG5cdCAqIGEgc3RyaW5nIGlzIHByb3ZpZGVkLCBvciByZXR1cm5zIHRoZSBGaWxhIGluc3RhbmNlIGFzLWlzIHdoZW4gYSBGaWxhXG5cdCAqIG9iamVjdCBpcyBwcm92aWRlZC5cblx0ICovXG5cdHN0YXRpYyBmcm9tKHZpYTogc3RyaW5nIHwgRmlsYSlcblx0e1xuXHRcdHJldHVybiB0eXBlb2YgdmlhID09PSBcInN0cmluZ1wiID8gbmV3IEZpbGEodmlhKSA6IHZpYTtcblx0fVxuXHRcblx0LyoqICovXG5cdGNvbnN0cnVjdG9yKC4uLmNvbXBvbmVudHM6IHN0cmluZ1tdKVxuXHR7XG5cdFx0Y29tcG9uZW50cyA9IGNvbXBvbmVudHMuZmlsdGVyKHMgPT4gISFzKTtcblx0XHRcblx0XHRpZiAoY29tcG9uZW50cy5qb2luKFwiXCIpICE9PSBcIi9cIilcblx0XHR7XG5cdFx0XHRpZiAoY29tcG9uZW50cy5sZW5ndGggPT09IDAgfHwgY29tcG9uZW50c1swXS5zdGFydHNXaXRoKFwiLlwiKSlcblx0XHRcdFx0Y29tcG9uZW50cy51bnNoaWZ0KEZpbGEuY3dkLnBhdGgpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gY29tcG9uZW50cy5sZW5ndGg7IGktLSA+IDA7KVxuXHRcdFx0XHRjb21wb25lbnRzLnNwbGljZShpLCAxLCAuLi5jb21wb25lbnRzW2ldLnNwbGl0KEZpbGEuc2VwKSk7XG5cdFx0XHRcblx0XHRcdGNvbXBvbmVudHMgPSBjb21wb25lbnRzLmZpbHRlcihzID0+ICEhcyk7XG5cdFx0XHRjb21wb25lbnRzID0gRmlsYS5ub3JtYWxpemUoY29tcG9uZW50cy5qb2luKEZpbGEuc2VwKSkuc3BsaXQoRmlsYS5zZXApO1xuXHRcdH1cblx0XHRcblx0XHR0aGlzLmNvbXBvbmVudHMgPSBjb21wb25lbnRzO1xuXHRcdGxldCBiYWNrOiBJbnN0YW5jZVR5cGU8dHlwZW9mIEZpbGEuRmlsYUJhY2tlbmQ+O1xuXHRcdC8vQHRzLWlnbm9yZVxuXHRcdGJhY2sgPSBuZXcgRmlsYS5iYWNrZW5kKHRoaXMpO1xuXHRcdHRoaXMuYmFjayA9IGJhY2s7XG5cdH1cblx0XG5cdHJlYWRvbmx5IGNvbXBvbmVudHM7XG5cdHByaXZhdGUgcmVhZG9ubHkgYmFjazogSW5zdGFuY2VUeXBlPHR5cGVvZiBGaWxhLkZpbGFCYWNrZW5kPjtcblx0XG5cdC8qKiAqL1xuXHRyZWFkVGV4dCgpOiBQcm9taXNlPHN0cmluZz4geyByZXR1cm4gdGhpcy5iYWNrLnJlYWRUZXh0KCk7IH1cblx0XG5cdC8qKiAqL1xuXHRyZWFkQmluYXJ5KCk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5yZWFkQmluYXJ5KCk7IH1cblx0XG5cdC8qKiAqL1xuXHRyZWFkRGlyZWN0b3J5KCk6IFByb21pc2U8RmlsYVtdPiB7IHJldHVybiB0aGlzLmJhY2sucmVhZERpcmVjdG9yeSgpOyB9XG5cdFxuXHQvKiogKi9cblx0d3JpdGVUZXh0KHRleHQ6IHN0cmluZywgb3B0aW9ucz86IEZpbGEuSVdyaXRlVGV4dE9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+XG5cdHtcblx0XHRyZXR1cm4gdGhpcy5iYWNrLndyaXRlVGV4dCh0ZXh0LCBvcHRpb25zKTtcblx0fVxuXHRcblx0LyoqICovXG5cdHdyaXRlQmluYXJ5KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay53cml0ZUJpbmFyeShidWZmZXIpOyB9XG5cdFxuXHQvKiogKi9cblx0d3JpdGVEaXJlY3RvcnkoKTogUHJvbWlzZTx2b2lkPiB7IHJldHVybiB0aGlzLmJhY2sud3JpdGVEaXJlY3RvcnkoKTsgfVxuXHRcblx0LyoqXG5cdCAqIFdyaXRlcyBhIHN5bWxpbmsgZmlsZSBhdCB0aGUgbG9jYXRpb24gcmVwcmVzZW50ZWQgYnkgdGhlIHNwZWNpZmllZFxuXHQgKiBGaWxhIG9iamVjdCwgdG8gdGhlIGxvY2F0aW9uIHNwZWNpZmllZCBieSB0aGUgY3VycmVudCBGaWxhIG9iamVjdC5cblx0ICovXG5cdHdyaXRlU3ltbGluayhhdDogRmlsYSk6IFByb21pc2U8dm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLndyaXRlU3ltbGluayhhdCk7IH1cblx0XG5cdC8qKlxuXHQgKiBEZWxldGVzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSB0aGF0IHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cy5cblx0ICovXG5cdGRlbGV0ZSgpOiBQcm9taXNlPEVycm9yIHwgdm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLmRlbGV0ZSgpOyB9XG5cdFxuXHQvKiogKi9cblx0bW92ZSh0YXJnZXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay5tb3ZlKHRhcmdldCk7IH1cblx0XG5cdC8qKlxuXHQgKiBDb3BpZXMgdGhlIGZpbGUgdG8gdGhlIHNwZWNpZmllZCBsb2NhdGlvbiwgYW5kIGNyZWF0ZXMgYW55XG5cdCAqIG5lY2Vzc2FyeSBkaXJlY3RvcmllcyBhbG9uZyB0aGUgd2F5LlxuXHQgKi9cblx0Y29weSh0YXJnZXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay5jb3B5KHRhcmdldCk7IH1cblx0XG5cdC8qKlxuXHQgKiBSZWN1cnNpdmVseSB3YXRjaGVzIHRoaXMgZm9sZGVyLCBhbmQgYWxsIG5lc3RlZCBmaWxlcyBjb250YWluZWRcblx0ICogd2l0aGluIGFsbCBzdWJmb2xkZXJzLiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB0ZXJtaW5hdGVzXG5cdCAqIHRoZSB3YXRjaCBzZXJ2aWNlIHdoZW4gY2FsbGVkLlxuXHQgKi9cblx0d2F0Y2goXG5cdFx0cmVjdXJzaXZlOiBcInJlY3Vyc2l2ZVwiLFxuXHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZCk6ICgpID0+IHZvaWQ7XG5cdC8qKlxuXHQgKiBXYXRjaGVzIGZvciBjaGFuZ2VzIHRvIHRoZSBzcGVjaWZpZWQgZmlsZSBvciBmb2xkZXIuIFJldHVybnNcblx0ICogYSBmdW5jdGlvbiB0aGF0IHRlcm1pbmF0ZXMgdGhlIHdhdGNoIHNlcnZpY2Ugd2hlbiBjYWxsZWQuXG5cdCAqL1xuXHR3YXRjaChcblx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpOiAoKSA9PiB2b2lkO1xuXHQvKiogKi9cblx0d2F0Y2goYTogYW55LCBiPzogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKVxuXHR7XG5cdFx0Y29uc3QgcmVjdXJzaXZlID0gYSA9PT0gXCJyZWN1cnNpdmVcIjtcblx0XHRjb25zdCBjYWxsYmFja0ZuID0gYiB8fCBhO1xuXHRcdHJldHVybiB0aGlzLndhdGNoUHJvdGVjdGVkKHJlY3Vyc2l2ZSwgY2FsbGJhY2tGbik7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRwcm90ZWN0ZWQgd2F0Y2hQcm90ZWN0ZWQoXG5cdFx0cmVjdXJzaXZlOiBib29sZWFuLCBcblx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpOiAoKSA9PiB2b2lkXG5cdHtcblx0XHRyZXR1cm4gdGhpcy5iYWNrLndhdGNoUHJvdGVjdGVkKHJlY3Vyc2l2ZSwgY2FsbGJhY2tGbik7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRyZW5hbWUobmV3TmFtZTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7IHJldHVybiB0aGlzLmJhY2sucmVuYW1lKG5ld05hbWUpOyB9XG5cdFxuXHQvKiogKi9cblx0ZXhpc3RzKCk6IFByb21pc2U8Ym9vbGVhbj4geyByZXR1cm4gdGhpcy5iYWNrLmV4aXN0cygpOyB9XG5cdFxuXHQvKiogKi9cblx0Z2V0U2l6ZSgpOiBQcm9taXNlPG51bWJlcj4geyByZXR1cm4gdGhpcy5iYWNrLmdldFNpemUoKTsgfVxuXHRcblx0LyoqICovXG5cdGdldE1vZGlmaWVkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5nZXRNb2RpZmllZFRpY2tzKCk7IH1cblx0XG5cdC8qKiAqL1xuXHRnZXRDcmVhdGVkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5nZXRDcmVhdGVkVGlja3MoKTsgfVxuXHRcblx0LyoqICovXG5cdGdldEFjY2Vzc2VkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+IHsgcmV0dXJuIHRoaXMuYmFjay5nZXRBY2Nlc3NlZFRpY2tzKCk7IH1cblx0XG5cdC8qKiAqL1xuXHRpc0RpcmVjdG9yeSgpOiBQcm9taXNlPGJvb2xlYW4+IHsgcmV0dXJuIHRoaXMuYmFjay5pc0RpcmVjdG9yeSgpOyB9XG5cdFxuXHQvKipcblx0ICogSW4gdGhlIGNhc2Ugd2hlbiB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMgYSBmaWxlLCB0aGlzIG1ldGhvZCByZXR1cm5zIGEgXG5cdCAqIEZpbGEgb2JqZWN0IHRoYXQgcmVwcmVzZW50cyB0aGUgZGlyZWN0b3J5IHRoYXQgY29udGFpbnMgc2FpZCBmaWxlLlxuXHQgKiBcblx0ICogSW4gdGhlIGNhc2Ugd2hlbiB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMgYSBkaXJlY3RvcnksIHRoaXMgbWV0aG9kXG5cdCAqIHJldHVybnMgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QgYXMtaXMuXG5cdCAqL1xuXHRhc3luYyBnZXREaXJlY3RvcnkoKTogUHJvbWlzZTxGaWxhPlxuXHR7XG5cdFx0aWYgKGF3YWl0IHRoaXMuaXNEaXJlY3RvcnkoKSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFxuXHRcdHJldHVybiBuZXcgRmlsYSguLi50aGlzLnVwKCkuY29tcG9uZW50cyk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSBuYW1lIG9mIHRoZSBmaWxlIHN5c3RlbSBvYmplY3QgYmVpbmdcblx0ICogcmVwcmVzZW50ZWQgYnkgdGhpcyBGaWxhIG9iamVjdC5cblx0ICovXG5cdGdldCBuYW1lKClcblx0e1xuXHRcdHJldHVybiB0aGlzLmNvbXBvbmVudHMuYXQoLTEpIHx8IFwiXCI7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHZXQgdGhlIGZpbGUgZXh0ZW5zaW9uIG9mIHRoZSBmaWxlIGJlaW5nIHJlcHJlc2VudGVkIGJ5IHRoaXNcblx0ICogRmlsYSBvYmplY3QsIHdpdGggdGhlIFwiLlwiIGNoYXJhY3Rlci5cblx0ICovXG5cdGdldCBleHRlbnNpb24oKVxuXHR7XG5cdFx0Y29uc3QgbmFtZSA9IHRoaXMubmFtZTtcblx0XHRjb25zdCBsYXN0RG90ID0gbmFtZS5sYXN0SW5kZXhPZihcIi5cIik7XG5cdFx0cmV0dXJuIGxhc3REb3QgPCAwID8gXCJcIiA6IG5hbWUuc2xpY2UobGFzdERvdCk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBHZXRzIHRoZSBmdWxseS1xdWFsaWZpZWQgcGF0aCwgaW5jbHVkaW5nIGFueSBmaWxlIG5hbWUgdG8gdGhlXG5cdCAqIGZpbGUgc3lzdGVtIG9iamVjdCBiZWluZyByZXByZXNlbnRlZCBieSB0aGlzIEZpbGEgb2JqZWN0LlxuXHQgKi9cblx0Z2V0IHBhdGgoKVxuXHR7XG5cdFx0cmV0dXJuIEZpbGEuc2VwICsgRmlsYS5qb2luKC4uLnRoaXMuY29tcG9uZW50cyk7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgRmlsYSBvYmplY3QgdGhhdCByZXByZXNlbnRzIHRoZSBmaXJzdCBvciBudGggY29udGFpbmluZ1xuXHQgKiBkaXJlY3Rvcnkgb2YgdGhlIG9iamVjdCB0aGF0IHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cy5cblx0ICogUmV0dXJucyB0aGUgdGhpcyByZWZlcmVuY2UgaW4gdGhlIGNhc2Ugd2hlbiB0aGUgXG5cdCAqL1xuXHR1cChjb3VudCA9IDEpXG5cdHtcblx0XHRpZiAodGhpcy5jb21wb25lbnRzLmxlbmd0aCA8IDIpXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcblx0XHRjb25zdCBwYXJlbnRDb21wb25lbnRzID0gdGhpcy5jb21wb25lbnRzLnNsaWNlKDAsIC1jb3VudCk7XG5cdFx0cmV0dXJuIHBhcmVudENvbXBvbmVudHMubGVuZ3RoID4gMCA/XG5cdFx0XHRuZXcgRmlsYSguLi5wYXJlbnRDb21wb25lbnRzKSA6XG5cdFx0XHRuZXcgRmlsYShcIi9cIik7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBTZWFyY2hlcyB1cHdhcmQgdGhyb3VnaCB0aGUgZmlsZSBzeXN0ZW0gYW5jZXN0cnkgZm9yIGEgbmVzdGVkIGZpbGUuXG5cdCAqL1xuXHRhc3luYyB1cHNjYW4ocmVsYXRpdmVGaWxlTmFtZTogc3RyaW5nKVxuXHR7XG5cdFx0bGV0IGFuY2VzdHJ5ID0gdGhpcyBhcyBGaWxhO1xuXHRcdFxuXHRcdGRvXG5cdFx0e1xuXHRcdFx0Y29uc3QgbWF5YmUgPSBhbmNlc3RyeS5kb3duKHJlbGF0aXZlRmlsZU5hbWUpO1xuXHRcdFx0aWYgKGF3YWl0IG1heWJlLmV4aXN0cygpKVxuXHRcdFx0XHRyZXR1cm4gbWF5YmU7XG5cdFx0XHRcblx0XHRcdGlmIChhbmNlc3RyeS5jb21wb25lbnRzLmxlbmd0aCA9PT0gMSlcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGFuY2VzdHJ5ID0gYW5jZXN0cnkudXAoKTtcblx0XHR9XG5cdFx0d2hpbGUgKGFuY2VzdHJ5LmNvbXBvbmVudHMubGVuZ3RoID4gMCk7XG5cdFx0XG5cdFx0cmV0dXJuIG51bGwgYXMgYW55IGFzIEZpbGEgfCBudWxsO1xuXHR9XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIEZpbGEgb2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIGZpbGUgb3IgZGlyZWN0b3J5IG5lc3RlZFxuXHQgKiB3aXRoaW4gdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QgKHdoaWNoIG11c3QgYmUgYSBkaXJlY3RvcnkpLlxuXHQgKi9cblx0ZG93biguLi5hZGRpdGlvbmFsQ29tcG9uZW50czogc3RyaW5nW10pXG5cdHtcblx0XHRyZXR1cm4gbmV3IEZpbGEoLi4udGhpcy5jb21wb25lbnRzLCAuLi5hZGRpdGlvbmFsQ29tcG9uZW50cyk7XG5cdH1cbn1cblxubmFtZXNwYWNlIEZpbGFcbntcblx0LyoqICovXG5cdGV4cG9ydCBpbnRlcmZhY2UgSVdyaXRlVGV4dE9wdGlvbnNcblx0e1xuXHRcdHJlYWRvbmx5IGFwcGVuZDogYm9vbGVhbjtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBmdW5jdGlvbiBqb2luKC4uLmFyZ3M6IHN0cmluZ1tdKVxuXHR7XG5cdFx0aWYgKGFyZ3MubGVuZ3RoID09PSAwKVxuXHRcdFx0cmV0dXJuIFwiLlwiO1xuXHRcdFxuXHRcdGxldCBqb2luZWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblx0XHRcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyArK2kpXG5cdFx0e1xuXHRcdFx0bGV0IGFyZyA9IGFyZ3NbaV07XG5cdFx0XHRcblx0XHRcdGlmIChhcmcubGVuZ3RoID4gMClcblx0XHRcdHtcblx0XHRcdFx0aWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0XHRcdGpvaW5lZCA9IGFyZztcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGpvaW5lZCArPSBcIi9cIiArIGFyZztcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0aWYgKGpvaW5lZCA9PT0gdW5kZWZpbmVkKVxuXHRcdFx0cmV0dXJuIFwiLlwiO1xuXHRcdFxuXHRcdHJldHVybiBub3JtYWxpemUoam9pbmVkKTtcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemUocGF0aDogc3RyaW5nKVxuXHR7XG5cdFx0aWYgKHBhdGgubGVuZ3RoID09PSAwKVxuXHRcdFx0cmV0dXJuIFwiLlwiO1xuXHRcdFxuXHRcdGNvbnN0IGlzQWJzb2x1dGUgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IENoYXIuc2xhc2g7XG5cdFx0Y29uc3QgdHJhaWxpbmdTZXBhcmF0b3IgPSBwYXRoLmNoYXJDb2RlQXQocGF0aC5sZW5ndGggLSAxKSA9PT0gQ2hhci5zbGFzaDtcblx0XHRcblx0XHQvLyBOb3JtYWxpemUgdGhlIHBhdGhcblx0XHRwYXRoID0gbm9ybWFsaXplU3RyaW5nUG9zaXgocGF0aCwgIWlzQWJzb2x1dGUpO1xuXHRcdFxuXHRcdGlmIChwYXRoLmxlbmd0aCA9PT0gMCAmJiAhaXNBYnNvbHV0ZSlcblx0XHRcdHBhdGggPSBcIi5cIjtcblx0XHRcblx0XHRpZiAocGF0aC5sZW5ndGggPiAwICYmIHRyYWlsaW5nU2VwYXJhdG9yKVxuXHRcdFx0cGF0aCArPSBGaWxhLnNlcDtcblx0XHRcblx0XHRpZiAoaXNBYnNvbHV0ZSlcblx0XHRcdHJldHVybiBGaWxhLnNlcCArIHBhdGg7XG5cdFx0XG5cdFx0cmV0dXJuIHBhdGg7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRmdW5jdGlvbiBub3JtYWxpemVTdHJpbmdQb3NpeChwYXRoOiBzdHJpbmcsIGFsbG93QWJvdmVSb290OiBib29sZWFuKVxuXHR7XG5cdFx0bGV0IHJlcyA9IFwiXCI7XG5cdFx0bGV0IGxhc3RTZWdtZW50TGVuZ3RoID0gMDtcblx0XHRsZXQgbGFzdFNsYXNoID0gLTE7XG5cdFx0bGV0IGRvdHMgPSAwO1xuXHRcdGxldCBjb2RlO1xuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDw9IHBhdGgubGVuZ3RoOyArK2kpXG5cdFx0e1xuXHRcdFx0aWYgKGkgPCBwYXRoLmxlbmd0aClcblx0XHRcdFx0Y29kZSA9IHBhdGguY2hhckNvZGVBdChpKTtcblx0XHRcdFxuXHRcdFx0ZWxzZSBpZiAoY29kZSA9PT0gQ2hhci5zbGFzaClcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGVsc2Vcblx0XHRcdFx0Y29kZSA9IENoYXIuc2xhc2g7XG5cdFx0XHRcblx0XHRcdGlmIChjb2RlID09PSBDaGFyLnNsYXNoKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAobGFzdFNsYXNoID09PSBpIC0gMSB8fCBkb3RzID09PSAxKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Ly8gTk9PUFxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGxhc3RTbGFzaCAhPT0gaSAtIDEgJiYgZG90cyA9PT0gMilcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChyZXMubGVuZ3RoIDwgMiB8fCBcblx0XHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoICE9PSAyIHx8IFxuXHRcdFx0XHRcdFx0cmVzLmNoYXJDb2RlQXQocmVzLmxlbmd0aCAtIDEpICE9PSBDaGFyLmRvdCB8fFxuXHRcdFx0XHRcdFx0cmVzLmNoYXJDb2RlQXQocmVzLmxlbmd0aCAtIDIpICE9PSBDaGFyLmRvdClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAocmVzLmxlbmd0aCA+IDIpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGxldCBsYXN0U2xhc2hJbmRleCA9IHJlcy5sYXN0SW5kZXhPZihGaWxhLnNlcCk7XG5cdFx0XHRcdFx0XHRcdGlmIChsYXN0U2xhc2hJbmRleCAhPT0gcmVzLmxlbmd0aCAtIDEpXG5cdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRpZiAobGFzdFNsYXNoSW5kZXggPT09IC0xKVxuXHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdHJlcyA9IFwiXCI7XG5cdFx0XHRcdFx0XHRcdFx0XHRsYXN0U2VnbWVudExlbmd0aCA9IDA7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXMgPSByZXMuc2xpY2UoMCwgbGFzdFNsYXNoSW5kZXgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0bGFzdFNlZ21lbnRMZW5ndGggPSByZXMubGVuZ3RoIC0gMSAtIHJlcy5sYXN0SW5kZXhPZihGaWxhLnNlcCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdGxhc3RTbGFzaCA9IGk7XG5cdFx0XHRcdFx0XHRcdFx0ZG90cyA9IDA7XG5cdFx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2UgaWYgKHJlcy5sZW5ndGggPT09IDIgfHwgcmVzLmxlbmd0aCA9PT0gMSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0cmVzID0gXCJcIjtcblx0XHRcdFx0XHRcdFx0bGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuXHRcdFx0XHRcdFx0XHRsYXN0U2xhc2ggPSBpO1xuXHRcdFx0XHRcdFx0XHRkb3RzID0gMDtcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChhbGxvd0Fib3ZlUm9vdClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAocmVzLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0XHRcdHJlcyArPSBcIi8uLlwiO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRyZXMgPSBcIi4uXCI7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoID0gMjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHJlcy5sZW5ndGggPiAwKVxuXHRcdFx0XHRcdFx0cmVzICs9IEZpbGEuc2VwICsgcGF0aC5zbGljZShsYXN0U2xhc2ggKyAxLCBpKTtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRyZXMgPSBwYXRoLnNsaWNlKGxhc3RTbGFzaCArIDEsIGkpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoID0gaSAtIGxhc3RTbGFzaCAtIDE7XG5cdFx0XHRcdH1cblx0XHRcdFx0bGFzdFNsYXNoID0gaTtcblx0XHRcdFx0ZG90cyA9IDA7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChjb2RlID09PSBDaGFyLmRvdCAmJiBkb3RzICE9PSAtMSlcblx0XHRcdHtcblx0XHRcdFx0Kytkb3RzO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBkb3RzID0gLTE7XG5cdFx0fVxuXHRcdHJldHVybiByZXM7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgZnVuY3Rpb24gcmVsYXRpdmUoZnJvbTogc3RyaW5nIHwgRmlsYSwgdG86IHN0cmluZyB8IEZpbGEpXG5cdHtcblx0XHRpZiAoZnJvbSA9PT0gdG8pXG5cdFx0XHRyZXR1cm4gXCJcIjtcblx0XHRcblx0XHRmcm9tID0gcG9zaXgucmVzb2x2ZShmcm9tIGluc3RhbmNlb2YgRmlsYSA/IGZyb20ucGF0aCA6IGZyb20pO1xuXHRcdHRvID0gcG9zaXgucmVzb2x2ZSh0byBpbnN0YW5jZW9mIEZpbGEgPyB0by5wYXRoIDogdG8pO1xuXHRcdFxuXHRcdGlmIChmcm9tID09PSB0bylcblx0XHRcdHJldHVybiBcIlwiO1xuXHRcdFxuXHRcdC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcblx0XHR2YXIgZnJvbVN0YXJ0ID0gMTtcblx0XHRmb3IgKDsgZnJvbVN0YXJ0IDwgZnJvbS5sZW5ndGg7ICsrZnJvbVN0YXJ0KSBcblx0XHRcdGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0KSAhPT0gNDcgLyovKi8pXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFxuXHRcdHZhciBmcm9tRW5kID0gZnJvbS5sZW5ndGg7XG5cdFx0dmFyIGZyb21MZW4gPSBmcm9tRW5kIC0gZnJvbVN0YXJ0O1xuXHRcdFxuXHRcdC8vIFRyaW0gYW55IGxlYWRpbmcgYmFja3NsYXNoZXNcblx0XHR2YXIgdG9TdGFydCA9IDE7XG5cdFx0Zm9yICg7IHRvU3RhcnQgPCB0by5sZW5ndGg7ICsrdG9TdGFydClcblx0XHRcdGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpICE9PSA0NyAvKi8qLylcblx0XHRcdFx0YnJlYWs7XG5cdFx0XG5cdFx0dmFyIHRvRW5kID0gdG8ubGVuZ3RoO1xuXHRcdHZhciB0b0xlbiA9IHRvRW5kIC0gdG9TdGFydDtcblx0XHRcblx0XHQvLyBDb21wYXJlIHBhdGhzIHRvIGZpbmQgdGhlIGxvbmdlc3QgY29tbW9uIHBhdGggZnJvbSByb290XG5cdFx0dmFyIGxlbmd0aCA9IGZyb21MZW4gPCB0b0xlbiA/IGZyb21MZW4gOiB0b0xlbjtcblx0XHR2YXIgbGFzdENvbW1vblNlcCA9IC0xO1xuXHRcdHZhciBpID0gMDtcblx0XHRmb3IgKDsgaSA8PSBsZW5ndGg7ICsraSlcblx0XHR7XG5cdFx0XHRpZiAoaSA9PT0gbGVuZ3RoKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAodG9MZW4gPiBsZW5ndGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0ICsgaSkgPT09IDQ3IC8qLyovIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIGV4YWN0IGJhc2UgcGF0aCBmb3IgYHRvYC5cblx0XHRcdFx0XHRcdC8vIEZvciBleGFtcGxlOiBmcm9tPVwiL2Zvby9iYXJcIjsgdG89XCIvZm9vL2Jhci9iYXpcIlxuXHRcdFx0XHRcdFx0cmV0dXJuIHRvLnNsaWNlKHRvU3RhcnQgKyBpICsgMSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKGkgPT09IDApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Ly8gV2UgZ2V0IGhlcmUgaWYgYGZyb21gIGlzIHRoZSByb290XG5cdFx0XHRcdFx0XHQvLyBGb3IgZXhhbXBsZTogZnJvbT1cIi9cIjsgdG89XCIvZm9vXCJcblx0XHRcdFx0XHRcdHJldHVybiB0by5zbGljZSh0b1N0YXJ0ICsgaSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGVsc2UgaWYgKGZyb21MZW4gPiBsZW5ndGgpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpID09PSA0NyAvKi8qLyApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Ly8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgZnJvbWAuXG5cdFx0XHRcdFx0XHQvLyBGb3IgZXhhbXBsZTogZnJvbT1cIi9mb28vYmFyL2JhelwiOyB0bz1cIi9mb28vYmFyXCJcblx0XHRcdFx0XHRcdGxhc3RDb21tb25TZXAgPSBpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChpID09PSAwKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdC8vIFdlIGdldCBoZXJlIGlmIGB0b2AgaXMgdGhlIHJvb3QuXG5cdFx0XHRcdFx0XHQvLyBGb3IgZXhhbXBsZTogZnJvbT1cIi9mb29cIjsgdG89XCIvXCJcblx0XHRcdFx0XHRcdGxhc3RDb21tb25TZXAgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0dmFyIGZyb21Db2RlID0gZnJvbS5jaGFyQ29kZUF0KGZyb21TdGFydCArIGkpO1xuXHRcdFx0dmFyIHRvQ29kZSA9IHRvLmNoYXJDb2RlQXQodG9TdGFydCArIGkpO1xuXHRcdFx0XG5cdFx0XHRpZiAoZnJvbUNvZGUgIT09IHRvQ29kZSlcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcblx0XHRcdGVsc2UgaWYgKGZyb21Db2RlID09PSA0NyAvKi8qLyApXG5cdFx0XHRcdGxhc3RDb21tb25TZXAgPSBpO1xuXHRcdH1cblx0XHRcblx0XHR2YXIgb3V0ID0gXCJcIjtcblx0XHQvLyBHZW5lcmF0ZSB0aGUgcmVsYXRpdmUgcGF0aCBiYXNlZCBvbiB0aGUgcGF0aCBkaWZmZXJlbmNlIGJldHdlZW4gYHRvYFxuXHRcdC8vIGFuZCBgZnJvbWBcblx0XHRmb3IgKGkgPSBmcm9tU3RhcnQgKyBsYXN0Q29tbW9uU2VwICsgMTsgaSA8PSBmcm9tRW5kOyArK2kpXG5cdFx0e1xuXHRcdFx0aWYgKGkgPT09IGZyb21FbmQgfHwgZnJvbS5jaGFyQ29kZUF0KGkpID09PSA0NyAvKi8qLyApXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChvdXQubGVuZ3RoID09PSAwKVxuXHRcdFx0XHRcdG91dCArPSBcIi4uXCI7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRvdXQgKz0gXCIvLi5cIjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0Ly8gTGFzdGx5LCBhcHBlbmQgdGhlIHJlc3Qgb2YgdGhlIGRlc3RpbmF0aW9uIChgdG9gKSBwYXRoIHRoYXQgY29tZXMgYWZ0ZXJcblx0XHQvLyB0aGUgY29tbW9uIHBhdGggcGFydHNcblx0XHRpZiAob3V0Lmxlbmd0aCA+IDApXG5cdFx0XHRyZXR1cm4gb3V0ICsgdG8uc2xpY2UodG9TdGFydCArIGxhc3RDb21tb25TZXApO1xuXHRcdFxuXHRcdHRvU3RhcnQgKz0gbGFzdENvbW1vblNlcDtcblx0XHRpZiAodG8uY2hhckNvZGVBdCh0b1N0YXJ0KSA9PT0gNDcgLyovKi8gKVxuXHRcdFx0Kyt0b1N0YXJ0O1xuXHRcdFxuXHRcdHJldHVybiB0by5zbGljZSh0b1N0YXJ0KTtcblx0fVxuXHRcblx0Y29uc3QgcG9zaXggPSB7XG5cdFx0cmVzb2x2ZSguLi5hcmdzOiBzdHJpbmdbXSlcblx0XHR7XG5cdFx0XHR2YXIgcmVzb2x2ZWRQYXRoID0gXCJcIjtcblx0XHRcdHZhciByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cdFx0XHR2YXIgY3dkO1xuXHRcdFx0XG5cdFx0XHRmb3IgKHZhciBpID0gYXJncy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBwYXRoO1xuXHRcdFx0XHRpZiAoaSA+PSAwKVxuXHRcdFx0XHRcdHBhdGggPSBhcmdzW2ldO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoY3dkID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIHByb2Nlc3MgPT09IFwib2JqZWN0XCIpXG5cdFx0XHRcdFx0XHRjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHBhdGggPSBjd2Q7XG5cdFx0XHRcdH1cblx0XHRcdFx0XG5cdFx0XHRcdC8vIFNraXAgZW1wdHkgZW50cmllc1xuXHRcdFx0XHRpZiAocGF0aC5sZW5ndGggPT09IDApXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZXNvbHZlZFBhdGggPSBwYXRoICsgXCIvXCIgKyByZXNvbHZlZFBhdGg7XG5cdFx0XHRcdHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJDb2RlQXQoMCkgPT09IDQ3IC8qLyovO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHQvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG5cdFx0XHQvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblx0XHRcdFxuXHRcdFx0Ly8gTm9ybWFsaXplIHRoZSBwYXRoXG5cdFx0XHRyZXNvbHZlZFBhdGggPSBub3JtYWxpemVTdHJpbmdQb3NpeChyZXNvbHZlZFBhdGgsICFyZXNvbHZlZEFic29sdXRlKTtcblx0XHRcdFxuXHRcdFx0aWYgKHJlc29sdmVkQWJzb2x1dGUpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMClcblx0XHRcdFx0XHRyZXR1cm4gXCIvXCIgKyByZXNvbHZlZFBhdGg7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXR1cm4gXCIvXCI7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmIChyZXNvbHZlZFBhdGgubGVuZ3RoID4gMClcblx0XHRcdFx0cmV0dXJuIHJlc29sdmVkUGF0aDtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIFwiLlwiO1xuXHRcdH0sXG5cdH07XG5cdFxuXHRkZWNsYXJlIGNvbnN0IHByb2Nlc3M6IGFueTtcblx0XG5cdC8qKiAqL1xuXHRjb25zdCBlbnVtIENoYXJcblx0e1xuXHRcdGRvdCA9IDQ2LFxuXHRcdHNsYXNoID0gNDcsXG5cdH1cblx0XG5cdC8qKiAqL1xuXHRleHBvcnQgY29uc3QgZW51bSBFdmVudFxuXHR7XG5cdFx0Y3JlYXRlID0gXCJjcmVhdGVcIixcblx0XHRtb2RpZnkgPSBcIm1vZGlmeVwiLFxuXHRcdGRlbGV0ZSA9IFwiZGVsZXRlXCIsXG5cdH1cbn1cblxuLy9AdHMtaWdub3JlIENvbW1vbkpTIGNvbXBhdGliaWxpdHlcbnR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgT2JqZWN0LmFzc2lnbihtb2R1bGUuZXhwb3J0cywgeyBGaWxhIH0pO1xuXG4vLyBDb21tb25KUyBtb2R1bGUgdHlwaW5nc1xuZGVjbGFyZSBtb2R1bGUgXCJAc3F1YXJlc2FwcC9maWxhXCJcbntcblx0ZXhwb3J0ID0gRmlsYTtcbn1cbiIsIlxuLyoqIEBpbnRlcm5hbCAqL1xuZGVjbGFyZSBjb25zdCBDQVBBQ0lUT1I6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIENBUEFDSVRPUiA9PT0gXCJ1bmRlZmluZWRcIilcblx0T2JqZWN0LmFzc2lnbihnbG9iYWxUaGlzLCB7IENBUEFDSVRPUjogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgKHdpbmRvdyBhcyBhbnkpLkNhcGFjaXRvciAhPT0gXCJ1bmRlZmluZWRcIiB9KTtcblx0XG5cdC8vQHRzLWlnbm9yZVxuXHRpZiAoIUNBUEFDSVRPUikgcmV0dXJuO1xuXHRcblx0LyoqICovXG5cdGNsYXNzIEZpbGFDYXBhY2l0b3IgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGdldCBmcygpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZyA9IGdsb2JhbFRoaXMgYXMgYW55O1xuXHRcdFx0Y29uc3QgZnMgPSBnLkNhcGFjaXRvcj8uUGx1Z2lucz8uRmlsZXN5c3RlbTtcblx0XHRcdGlmICghZnMpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcIkZpbGVzeXN0ZW0gcGx1Z2luIG5vdCBhZGRlZCB0byBDYXBhY2l0b3IuXCIpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZnMgYXMgdHlwZW9mIGltcG9ydChcIkBjYXBhY2l0b3IvZmlsZXN5c3RlbVwiKS5GaWxlc3lzdGVtO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBHZXRzIHRoZSBmdWxseS1xdWFsaWZpZWQgcGF0aCwgaW5jbHVkaW5nIGFueSBmaWxlIG5hbWUgdG8gdGhlXG5cdFx0ICogZmlsZSBzeXN0ZW0gb2JqZWN0IGJlaW5nIHJlcHJlc2VudGVkIGJ5IHRoaXMgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0Z2V0IHBhdGgoKVxuXHRcdHtcblx0XHRcdHJldHVybiBGaWxhLmpvaW4oLi4udGhpcy5maWxhLmNvbXBvbmVudHMpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkVGV4dCgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5mcy5yZWFkRmlsZSh7XG5cdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0ZW5jb2Rpbmc6IFwidXRmOFwiIGFzIGFueVxuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiByZXN1bHQuZGF0YSBhcyBzdHJpbmc7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWRCaW5hcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZnMucmVhZEZpbGUoe1xuXHRcdFx0XHQuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksXG5cdFx0XHRcdGVuY29kaW5nOiBcImFzY2lpXCIgYXMgYW55XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0Ly8gRG9lcyB0aGlzIHdvcmsgb24gaU9TP1xuXHRcdFx0Y29uc3QgYmxvYiA9IHJlc3VsdC5kYXRhIGFzIEJsb2I7XG5cdFx0XHRjb25zdCBidWZmZXIgPSBhd2FpdCBuZXcgUmVzcG9uc2UoYmxvYikuYXJyYXlCdWZmZXIoKTtcblx0XHRcdHJldHVybiBuZXcgVWludDhBcnJheShidWZmZXIpO1xuXHRcdFx0XG5cdFx0XHQvL2NvbnN0IGJhc2U2NCA9IHJlc3VsdC5kYXRhO1xuXHRcdFx0Ly9yZXR1cm4gVWludDhBcnJheS5mcm9tKGF0b2IoYmFzZTY0KSwgYyA9PiBjLmNoYXJDb2RlQXQoMCkpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmZzLnJlYWRkaXIodGhpcy5nZXREZWZhdWx0T3B0aW9ucygpKTtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmaWxlIG9mIHJlc3VsdC5maWxlcylcblx0XHRcdFx0aWYgKGZpbGUubmFtZSAhPT0gXCIuRFNfU3RvcmVcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKHRoaXMucGF0aCwgZmlsZS5uYW1lIHx8IFwiXCIpKTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIGZpbGFzO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZVRleHQodGV4dDogc3RyaW5nLCBvcHRpb25zPzogRmlsYS5JV3JpdGVUZXh0T3B0aW9ucylcblx0XHR7XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgdXAgPSB0aGlzLmZpbGEudXAoKTtcblx0XHRcdFx0aWYgKCFhd2FpdCB1cC5leGlzdHMoKSlcblx0XHRcdFx0XHRhd2FpdCB1cC53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0Y29uc3Qgd3JpdGVPcHRpb25zID0ge1xuXHRcdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0XHRkYXRhOiB0ZXh0LFxuXHRcdFx0XHRcdGVuY29kaW5nOiBcInV0ZjhcIiBhcyBhbnlcblx0XHRcdFx0fTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChvcHRpb25zPy5hcHBlbmQpXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5mcy5hcHBlbmRGaWxlKHdyaXRlT3B0aW9ucyk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmZzLndyaXRlRmlsZSh3cml0ZU9wdGlvbnMpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJXcml0ZSBmYWlsZWQgdG8gcGF0aDogXCIgKyB0aGlzLnBhdGgpO1xuXHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZmlsYS51cCgpLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5hcnJheUJ1ZmZlclRvQmFzZTY0KGFycmF5QnVmZmVyKTtcblx0XHRcdGF3YWl0IHRoaXMuZnMud3JpdGVGaWxlKHtcblx0XHRcdFx0Li4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLFxuXHRcdFx0XHRkYXRhLFxuXHRcdFx0XHRlbmNvZGluZzogXCJhc2NpaVwiIGFzIGFueVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KHIgPT5cblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYmxvYiA9IG5ldyBCbG9iKFtidWZmZXJdLCB7IHR5cGU6IFwiYXBwbGljYXRpb24vb2N0ZXQtYmluYXJ5XCIgfSk7XG5cdFx0XHRcdGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRyZWFkZXIub25sb2FkID0gZXYgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGNvbnN0IGRhdGFVcmwgPSAoZXYudGFyZ2V0Py5yZXN1bHQgfHwgXCJcIikgYXMgc3RyaW5nO1xuXHRcdFx0XHRcdGNvbnN0IHNsaWNlID0gZGF0YVVybC5zbGljZShkYXRhVXJsLmluZGV4T2YoYCxgKSArIDEpO1xuXHRcdFx0XHRcdHIoc2xpY2UpO1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChibG9iKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZURpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5mcy5ta2Rpcih7XG5cdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0cmVjdXJzaXZlOiB0cnVlXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdFx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0YXN5bmMgd3JpdGVTeW1saW5rKGF0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdFx0ICovXG5cdFx0YXN5bmMgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPlxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxFcnJvciB8IHZvaWQ+KGFzeW5jIHIgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGF3YWl0IHRoaXMuZnMucm1kaXIoe1xuXHRcdFx0XHRcdFx0Li4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLFxuXHRcdFx0XHRcdFx0cmVjdXJzaXZlOiB0cnVlXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0cigpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0YXdhaXQgdGhpcy5mcy5kZWxldGVGaWxlKHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIG1vdmUodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZC5cIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGNvcHkodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZyb21PcHRpb25zID0gdGhpcy5nZXREZWZhdWx0T3B0aW9ucygpO1xuXHRcdFx0Y29uc3QgdG9PcHRpb25zID0gdGhpcy5nZXREZWZhdWx0T3B0aW9ucyh0YXJnZXQucGF0aCk7XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMuY29weSh7XG5cdFx0XHRcdGZyb206IGZyb21PcHRpb25zLnBhdGgsXG5cdFx0XHRcdGRpcmVjdG9yeTogZnJvbU9wdGlvbnMuZGlyZWN0b3J5LFxuXHRcdFx0XHR0bzogdG9PcHRpb25zLnBhdGgsXG5cdFx0XHRcdHRvRGlyZWN0b3J5OiB0b09wdGlvbnMuZGlyZWN0b3J5LFxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlbmFtZShuZXdOYW1lOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0Y29uc3QgdGFyZ2V0ID0gdGhpcy5maWxhLnVwKCkuZG93bihuZXdOYW1lKS5wYXRoO1xuXHRcdFx0Y29uc3QgZnJvbU9wdGlvbnMgPSB0aGlzLmdldERlZmF1bHRPcHRpb25zKCk7XG5cdFx0XHRjb25zdCB0b09wdGlvbnMgPSB0aGlzLmdldERlZmF1bHRPcHRpb25zKHRhcmdldCk7XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMucmVuYW1lKHtcblx0XHRcdFx0ZnJvbTogdGhpcy5wYXRoLFxuXHRcdFx0XHRkaXJlY3Rvcnk6IGZyb21PcHRpb25zLmRpcmVjdG9yeSxcblx0XHRcdFx0dG86IHRhcmdldCxcblx0XHRcdFx0dG9EaXJlY3Rvcnk6IHRvT3B0aW9ucy5kaXJlY3Rvcnlcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHR3YXRjaFByb3RlY3RlZChcblx0XHRcdHJlY3Vyc2l2ZTogYm9vbGVhbixcblx0XHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZCk6ICgpID0+IHZvaWRcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWRcIik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGV4aXN0cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuICEhYXdhaXQgdGhpcy5nZXRTdGF0KCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRTdGF0KCkpPy5zaXplIHx8IDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldE1vZGlmaWVkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRTdGF0KCkpPy5tdGltZSB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRDcmVhdGVkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRTdGF0KCkpPy5jdGltZSB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRBY2Nlc3NlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgaXNEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRTdGF0KCkpPy50eXBlID09PSBcImRpcmVjdG9yeVwiO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGFzeW5jIGdldFN0YXQoKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5mcy5zdGF0KHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSkgeyByZXR1cm4gbnVsbDsgfVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGdldERlZmF1bHRPcHRpb25zKHRhcmdldFBhdGg6IHN0cmluZyA9IHRoaXMucGF0aClcblx0XHR7XG5cdFx0XHRjb25zdCBzbGFzaCA9IHRhcmdldFBhdGguaW5kZXhPZihcIi9cIik7XG5cdFx0XHRsZXQgcGF0aCA9IFwiXCI7XG5cdFx0XHRsZXQgZGlyZWN0b3J5ID0gXCJcIjtcblx0XHRcdFxuXHRcdFx0aWYgKHNsYXNoIDwgMClcblx0XHRcdHtcblx0XHRcdFx0cGF0aCA9IHRhcmdldFBhdGg7XG5cdFx0XHRcdGRpcmVjdG9yeSA9IERpcmVjdG9yeS5jYWNoZSBhcyBhbnkgYXMgVERpcmVjdG9yeTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0cGF0aCA9IHRhcmdldFBhdGguc2xpY2Uoc2xhc2ggKyAxKTtcblx0XHRcdFx0ZGlyZWN0b3J5ID0gdGFyZ2V0UGF0aC5zbGljZSgwLCBzbGFzaCkgYXMgVERpcmVjdG9yeTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Y29uc3QgcmVzdWx0ID0ge1xuXHRcdFx0XHRwYXRoLFxuXHRcdFx0XHRkaXJlY3Rvcnk6IGRpcmVjdG9yeSBhcyBURGlyZWN0b3J5XG5cdFx0XHR9O1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fVxuXHRcblx0XG5cdC8qKiAqL1xuXHRjb25zdCBlbnVtIERpcmVjdG9yeVxuXHR7XG5cdFx0Y2FjaGUgPSBcIkNBQ0hFXCIsXG5cdFx0ZGF0YSA9IFwiREFUQVwiLFxuXHRcdGRvY3VtZW50cyA9IFwiRE9DVU1FTlRTXCIsXG5cdFx0ZXh0ZXJuYWwgPSBcIkVYVEVSTkFMXCIsXG5cdFx0ZXh0ZXJuYWxTdG9yYWdlID0gXCJFWFRFUk5BTF9TVE9SQUdFXCIsXG5cdFx0bGlicmFyeSA9IFwiTElCUkFSWVwiLFxuXHR9XG5cdFxuXHQvKiogKi9cblx0dHlwZSBURGlyZWN0b3J5ID0gaW1wb3J0KFwiQGNhcGFjaXRvci9maWxlc3lzdGVtXCIpLkRpcmVjdG9yeTtcblx0XG5cdGNvbnN0IGN3ZCA9IFwiREFUQVwiO1xuXHRjb25zdCB0bXAgPSBcIkNBQ0hFXCI7XG5cdGNvbnN0IHNlcCA9IFwiL1wiO1xuXHRGaWxhLnNldHVwKEZpbGFDYXBhY2l0b3IsIHNlcCwgY3dkLCB0bXApO1xufSkoKTsiLCJcbi8qKiBAaW50ZXJuYWwgKi9cbmRlY2xhcmUgY29uc3QgTk9ERTogYm9vbGVhbjtcblxuKCgpID0+XG57XG5cdGlmICh0eXBlb2YgTk9ERSA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRPYmplY3QuYXNzaWduKGdsb2JhbFRoaXMsIHsgTk9ERTogdHlwZW9mIHByb2Nlc3MgKyB0eXBlb2YgcmVxdWlyZSA9PT0gXCJvYmplY3RmdW5jdGlvblwiIH0pO1xuXHRcblx0Ly9AdHMtaWdub3JlXG5cdGlmICghTk9ERSkgcmV0dXJuO1xuXHRcblx0Y2xhc3MgRmlsYU5vZGUgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIHJlYWRvbmx5IGZzID0gcmVxdWlyZShcImZzXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJmc1wiKTtcblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkVGV4dCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuZnMucHJvbWlzZXMucmVhZEZpbGUodGhpcy5maWxhLnBhdGgsIFwidXRmOFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZEJpbmFyeSgpOiBQcm9taXNlPEFycmF5QnVmZmVyPlxuXHRcdHtcblx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmZzLnByb21pc2VzLnJlYWRGaWxlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZERpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmlsZU5hbWVzID0gYXdhaXQgdGhpcy5mcy5wcm9taXNlcy5yZWFkZGlyKHRoaXMuZmlsYS5wYXRoKTtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlTmFtZXMpXG5cdFx0XHRcdGlmIChmaWxlTmFtZSAhPT0gXCIuRFNfU3RvcmVcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKC4uLnRoaXMuZmlsYS5jb21wb25lbnRzLCBmaWxlTmFtZSkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZmlsYS51cCgpLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRcblx0XHRcdGlmIChvcHRpb25zPy5hcHBlbmQpXG5cdFx0XHRcdGF3YWl0IHRoaXMuZnMucHJvbWlzZXMuYXBwZW5kRmlsZSh0aGlzLmZpbGEucGF0aCwgdGV4dCk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGF3YWl0IHRoaXMuZnMucHJvbWlzZXMud3JpdGVGaWxlKHRoaXMuZmlsYS5wYXRoLCB0ZXh0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZmlsYS51cCgpLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShhcnJheUJ1ZmZlcik7XG5cdFx0XHRhd2FpdCB0aGlzLmZzLnByb21pc2VzLndyaXRlRmlsZSh0aGlzLmZpbGEucGF0aCwgYnVmZmVyKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGlmICghdGhpcy5mcy5leGlzdHNTeW5jKHRoaXMuZmlsYS5wYXRoKSlcblx0XHRcdFx0YXdhaXQgdGhpcy5mcy5wcm9taXNlcy5ta2Rpcih0aGlzLmZpbGEucGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFdyaXRlcyBhIHN5bWxpbmsgZmlsZSBhdCB0aGUgbG9jYXRpb24gcmVwcmVzZW50ZWQgYnkgdGhlIHNwZWNpZmllZFxuXHRcdCAqIEZpbGEgb2JqZWN0LCB0byB0aGUgbG9jYXRpb24gc3BlY2lmaWVkIGJ5IHRoZSBjdXJyZW50IEZpbGEgb2JqZWN0LlxuXHRcdCAqL1xuXHRcdGFzeW5jIHdyaXRlU3ltbGluayhhdDogRmlsYSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8dm9pZD4ociA9PlxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmZzLnN5bWxpbmsoYXQucGF0aCwgdGhpcy5maWxhLnBhdGgsICgpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIERlbGV0ZXMgdGhlIGZpbGUgb3IgZGlyZWN0b3J5IHRoYXQgdGhpcyBGaWxhIG9iamVjdCByZXByZXNlbnRzLlxuXHRcdCAqL1xuXHRcdGFzeW5jIGRlbGV0ZSgpOiBQcm9taXNlPEVycm9yIHwgdm9pZD5cblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8RXJyb3IgfCB2b2lkPihyZXNvbHZlID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmZzLnJtZGlyKHRoaXMuZmlsYS5wYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9LCBlcnJvciA9PlxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdHJlc29sdmUoZXJyb3IgfHwgdm9pZCAwKTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMucHJvbWlzZXMudW5saW5rKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bW92ZSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT5cblx0XHRcdHtcblx0XHRcdFx0dGhpcy5mcy5yZW5hbWUodGhpcy5maWxhLnBhdGgsIHRhcmdldC5wYXRoLCAoKSA9PiByZXNvbHZlKCkpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvcHkodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihhc3luYyByZXNvbHZlID0+XG5cdFx0XHR7XG5cdFx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmZzLmNwKHRoaXMuZmlsYS5wYXRoLCB0YXJnZXQucGF0aCwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0sICgpID0+IHJlc29sdmUoKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgZGlyID0gdGFyZ2V0LnVwKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCFhd2FpdCBkaXIuZXhpc3RzKCkpXG5cdFx0XHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZShyID0+IHRoaXMuZnMubWtkaXIoZGlyLnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0sIHIpKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR0aGlzLmZzLmNvcHlGaWxlKHRoaXMuZmlsYS5wYXRoLCB0YXJnZXQucGF0aCwgKCkgPT4gcmVzb2x2ZSgpKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHdhdGNoUHJvdGVjdGVkKFxuXHRcdFx0cmVjdXJzaXZlOiBib29sZWFuLFxuXHRcdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhLCBzZWNvbmRhcnlGaWxhPzogRmlsYSkgPT4gdm9pZClcblx0XHR7XG5cdFx0XHRjb25zdCB3YXRjaGVyID0gRmlsYU5vZGUuY2hva2lkYXIud2F0Y2godGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0XG5cdFx0XHR3YXRjaGVyLm9uKFwicmVhZHlcIiwgKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0d2F0Y2hlci5vbihcImFsbFwiLCAoZXZOYW1lLCBwYXRoKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHBhdGguZW5kc1dpdGgoXCIvLkRTX1N0b3JlXCIpKVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGxldCBldjogRmlsYS5FdmVudCB8IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoZXZOYW1lID09PSBcImFkZFwiKVxuXHRcdFx0XHRcdFx0ZXYgPSBGaWxhLkV2ZW50LmNyZWF0ZTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChldk5hbWUgPT09IFwiY2hhbmdlXCIpXG5cdFx0XHRcdFx0XHRldiA9IEZpbGEuRXZlbnQubW9kaWZ5O1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKGV2TmFtZSA9PT0gXCJ1bmxpbmtcIilcblx0XHRcdFx0XHRcdGV2ID0gRmlsYS5FdmVudC5kZWxldGU7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGV2KVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2tGbihldiwgbmV3IEZpbGEocGF0aCkpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gKCkgPT4geyB3YXRjaGVyLnJlbW92ZUFsbExpc3RlbmVycygpIH07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgc3RhdGljIGdldCBjaG9raWRhcigpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX2Nob2tpZGFyIHx8ICh0aGlzLl9jaG9raWRhciA9IHJlcXVpcmUoXCJjaG9raWRhclwiKSk7XG5cdFx0fVxuXHRcdHByaXZhdGUgc3RhdGljIF9jaG9raWRhcjogdHlwZW9mIGltcG9ydChcImNob2tpZGFyXCIpO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlbmFtZShuZXdOYW1lOiBzdHJpbmcpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuZnMucHJvbWlzZXMucmVuYW1lKHRoaXMuZmlsYS5wYXRoLCB0aGlzLmZpbGEudXAoKS5kb3duKG5ld05hbWUpLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxib29sZWFuPihyID0+XG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZnMuc3RhdCh0aGlzLmZpbGEucGF0aCwgZXJyb3IgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHIoIWVycm9yKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0U2l6ZSgpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFN0YXRzKCk7XG5cdFx0XHRyZXR1cm4gc3RhdHM/LnNpemUgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0TW9kaWZpZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFN0YXRzKCk7XG5cdFx0XHRyZXR1cm4gc3RhdHM/Lm10aW1lTXMgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0Q3JlYXRlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRjb25zdCBzdGF0cyA9IGF3YWl0IHRoaXMuZ2V0U3RhdHMoKTtcblx0XHRcdHJldHVybiBzdGF0cz8uYmlydGh0aW1lTXMgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFN0YXRzKCk7XG5cdFx0XHRyZXR1cm4gc3RhdHM/LmF0aW1lTXMgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgaXNEaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXRzID0gYXdhaXQgdGhpcy5nZXRTdGF0cygpO1xuXHRcdFx0cmV0dXJuIHN0YXRzPy5pc0RpcmVjdG9yeSgpIHx8IGZhbHNlO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIGFzeW5jIGdldFN0YXRzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8aW1wb3J0KFwiZnNcIikuU3RhdHMgfCB1bmRlZmluZWQ+KHIgPT5cblx0XHRcdHtcblx0XHRcdFx0dGhpcy5mcy5zdGF0KHRoaXMuZmlsYS5wYXRoLCAoZXJyb3IsIHN0YXRzKSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cihzdGF0cyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cdFxuXHRjb25zdCBzZXAgPSAocmVxdWlyZShcInBhdGhcIikgYXMgdHlwZW9mIGltcG9ydChcInBhdGhcIikpLnNlcDtcblx0Y29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcblx0Y29uc3QgdG1wID0gKHJlcXVpcmUoXCJvc1wiKSBhcyB0eXBlb2YgaW1wb3J0KFwib3NcIikpLnRtcGRpcigpO1xuXHRGaWxhLnNldHVwKEZpbGFOb2RlLCBzZXAsIGN3ZCwgdG1wKTtcbn0pKCk7XG4iLCJcbi8qKiBAaW50ZXJuYWwgKi9cbmRlY2xhcmUgY29uc3QgVEFVUkk6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIFRBVVJJID09PSBcInVuZGVmaW5lZFwiKVxuXHRcdE9iamVjdC5hc3NpZ24oZ2xvYmFsVGhpcywgeyBUQVVSSTogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgKGdsb2JhbFRoaXMgYXMgYW55KS5fX1RBVVJJX18gIT09IFwidW5kZWZpbmVkXCIgfSk7XG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKCFUQVVSSSkgcmV0dXJuO1xuXHRcblx0Y2xhc3MgRmlsYVRhdXJpIGV4dGVuZHMgRmlsYS5GaWxhQmFja2VuZFxuXHR7XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSByZWFkb25seSBmczogdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS5mcyA9IFxuXHRcdFx0KGdsb2JhbFRoaXMgYXMgYW55KS5fX1RBVVJJX18uZnM7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZFRleHQoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmZzLnJlYWRUZXh0RmlsZSh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlYWRCaW5hcnkoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmZzLnJlYWRCaW5hcnlGaWxlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZERpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZmlsZU5hbWVzID0gYXdhaXQgdGhpcy5mcy5yZWFkRGlyKHRoaXMuZmlsYS5wYXRoKTtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmaWxlTmFtZSBvZiBmaWxlTmFtZXMpXG5cdFx0XHRcdGlmIChmaWxlTmFtZS5uYW1lICE9PSBcIi5EU19TdG9yZVwiKVxuXHRcdFx0XHRcdGZpbGFzLnB1c2gobmV3IEZpbGEodGhpcy5maWxhLnBhdGgsIGZpbGVOYW1lLm5hbWUgfHwgXCJcIikpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB1cCA9IHRoaXMuZmlsYS51cCgpO1xuXHRcdFx0XHRpZiAoIWF3YWl0IHVwLmV4aXN0cygpKVxuXHRcdFx0XHRcdGF3YWl0IHVwLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRhd2FpdCB0aGlzLmZzLndyaXRlVGV4dEZpbGUodGhpcy5maWxhLnBhdGgsIHRleHQsIHtcblx0XHRcdFx0XHRhcHBlbmQ6IG9wdGlvbnM/LmFwcGVuZFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKVxuXHRcdFx0e1xuXHRcdFx0XHRkZWJ1Z2dlcjtcblx0XHRcdH1cblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuZmlsYS51cCgpLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRhd2FpdCB0aGlzLmZzLndyaXRlQmluYXJ5RmlsZSh0aGlzLmZpbGEucGF0aCwgYXJyYXlCdWZmZXIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZURpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0dGhpcy5mcy5jcmVhdGVEaXIodGhpcy5maWxhLnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBXcml0ZXMgYSBzeW1saW5rIGZpbGUgYXQgdGhlIGxvY2F0aW9uIHJlcHJlc2VudGVkIGJ5IHRoZSBzcGVjaWZpZWRcblx0XHQgKiBGaWxhIG9iamVjdCwgdG8gdGhlIGxvY2F0aW9uIHNwZWNpZmllZCBieSB0aGUgY3VycmVudCBGaWxhIG9iamVjdC5cblx0XHQgKi9cblx0XHRhc3luYyB3cml0ZVN5bWxpbmsoYXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG51bGwgYXMgYW55O1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBEZWxldGVzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSB0aGF0IHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cy5cblx0XHQgKi9cblx0XHRhc3luYyBkZWxldGUoKTogUHJvbWlzZTxFcnJvciB8IHZvaWQ+XG5cdFx0e1xuXHRcdFx0aWYgKGF3YWl0IHRoaXMuaXNEaXJlY3RvcnkoKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPEVycm9yIHwgdm9pZD4oYXN5bmMgcmVzb2x2ZSA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5mcy5yZW1vdmVEaXIodGhpcy5maWxhLnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuXHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMucmVtb3ZlRmlsZSh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdG1vdmUodGFyZ2V0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHJldHVybiBudWxsIGFzIGFueTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgY29weSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0aWYgKGF3YWl0IHRhcmdldC5leGlzdHMoKSlcblx0XHRcdFx0aWYgKGF3YWl0IHRhcmdldC5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0XHRcdHRocm93IFwiQ29weWluZyBkaXJlY3RvcmllcyBpcyBub3QgaW1wbGVtZW50ZWQuXCI7XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMuY29weUZpbGUodGhpcy5maWxhLnBhdGgsIHRhcmdldC5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0d2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sXG5cdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpXG5cdFx0e1xuXHRcdFx0bGV0IHVuOiBGdW5jdGlvbiB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHQoYXN5bmMgKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0dW4gPSBhd2FpdCB3YXRjaEludGVybmFsKHRoaXMuZmlsYS5wYXRoLCB7fSwgYXN5bmMgZXYgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICghdW4pXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgcGF5bG9hZCA9IGV2LnBheWxvYWQucGF5bG9hZDtcblx0XHRcdFx0XHRpZiAodHlwZW9mIHBheWxvYWQgIT09IFwic3RyaW5nXCIpXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgZmlsYSA9IG5ldyBGaWxhKGV2LnBheWxvYWQucGF5bG9hZCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGV2LnR5cGUgPT09IFwiTm90aWNlV3JpdGVcIiB8fCBldi50eXBlID09PSBcIldyaXRlXCIpXG5cdFx0XHRcdFx0XHRjYWxsYmFja0ZuKEZpbGEuRXZlbnQubW9kaWZ5LCBmaWxhKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChldi50eXBlID09PSBcIk5vdGljZVJlbW92ZVwiIHx8IGV2LnR5cGUgPT09IFwiUmVtb3ZlXCIpXG5cdFx0XHRcdFx0XHRjYWxsYmFja0ZuKEZpbGEuRXZlbnQuZGVsZXRlLCBmaWxhKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChldi50eXBlID09PSBcIkNyZWF0ZVwiIHx8IGV2LnR5cGUgPT09IFwiUmVuYW1lXCIpXG5cdFx0XHRcdFx0XHRjYWxsYmFja0ZuKEZpbGEuRXZlbnQubW9kaWZ5LCBmaWxhKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KSgpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0Ly8gVGhpcyBpcyBoYWNreS4uLiB0aGUgaW50ZXJmYWNlIGV4cGVjdHMgYSBmdW5jdGlvbiB0byBiZVxuXHRcdFx0XHQvLyByZXR1cm5lZCByYXRoZXIgdGhhbiBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBvbmUsXG5cdFx0XHRcdC8vIHNvIHRoaXMgd2FpdHMgMTAwbXMgdG8gY2FsbCB0aGUgdW4oKSBmdW5jdGlvbiBpZiB0aGlzIHVud2F0Y2hcblx0XHRcdFx0Ly8gZnVuY3Rpb24gaXMgaW52b2tlZCBpbW1lZGlhdGVseSBhZnRlciBjYWxsaW5nIHdhdGNoKCkuXG5cdFx0XHRcdGlmICh1bilcblx0XHRcdFx0XHR1bigpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB1bj8uKCksIDEwMCk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZW5hbWUobmV3TmFtZTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdC8vIE5vdGUgdGhhdCB0aGUgXCJyZW5hbWVGaWxlXCIgbWV0aG9kIGFjdHVhbGx5IHdvcmtzIG9uIGRpcmVjdG9yaWVzXG5cdFx0XHRyZXR1cm4gdGhpcy5mcy5yZW5hbWVGaWxlKHRoaXMuZmlsYS5wYXRoLCB0aGlzLmZpbGEudXAoKS5kb3duKG5ld05hbWUpLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmZzLmV4aXN0cyh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRNZXRhKCkpLnNpemU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldE1vZGlmaWVkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRNZXRhKCkpLm1vZGlmaWVkQXQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldENyZWF0ZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldE1ldGEoKSkuY3JlYXRlZEF0O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRBY2Nlc3NlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0TWV0YSgpKS5hY2Nlc3NlZEF0O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBpc0RpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldE1ldGEoKSkuaXNEaXI7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgYXN5bmMgZ2V0TWV0YSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX21ldGEgfHwgKHRoaXMuX21ldGEgPSBhd2FpdCBnZXRNZXRhZGF0YSh0aGlzLmZpbGEucGF0aCkpO1xuXHRcdH1cblx0XHRwcml2YXRlIF9tZXRhOiBNZXRhZGF0YSB8IG51bGwgPSBudWxsO1xuXHR9XG5cdFxuXHRjb25zdCB0ID0gKGdsb2JhbFRoaXMgYXMgYW55KS5fX1RBVVJJX187XG5cdGNvbnN0IHRhdXJpOiB0eXBlb2YgaW1wb3J0KFwiQHRhdXJpLWFwcHMvYXBpXCIpLnRhdXJpID0gdC50YXVyaTtcblx0Y29uc3Qgd2luZDogdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS53aW5kb3cgPSB0LndpbmRvdztcblxuXHQvKiogQGludGVybmFsICovXG5cdGFzeW5jIGZ1bmN0aW9uIHVud2F0Y2goaWQ6IGFueSlcblx0e1xuXHRcdGF3YWl0IHRhdXJpLmludm9rZSgncGx1Z2luOmZzLXdhdGNofHVud2F0Y2gnLCB7IGlkIH0pO1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRhc3luYyBmdW5jdGlvbiB3YXRjaEludGVybmFsKFxuXHRcdHBhdGhzOiBzdHJpbmcgfCBzdHJpbmdbXSxcblx0XHRvcHRpb25zOiBEZWJvdW5jZWRXYXRjaE9wdGlvbnMsXG5cdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBUYXVyaVdhdGNoRXZlbnQpID0+IHZvaWQpOiBQcm9taXNlPCgpID0+IFByb21pc2U8dm9pZD4+XG5cdHtcblx0XHRjb25zdCBvcHRzID0ge1xuXHRcdFx0cmVjdXJzaXZlOiBmYWxzZSxcblx0XHRcdGRlbGF5TXM6IDIwMDAsXG5cdFx0XHQuLi5vcHRpb25zLFxuXHRcdH07XG5cdFx0XG5cdFx0bGV0IHdhdGNoUGF0aHM7XG5cdFx0aWYgKHR5cGVvZiBwYXRocyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHdhdGNoUGF0aHMgPSBbcGF0aHNdO1xuXHRcdGVsc2Vcblx0XHRcdHdhdGNoUGF0aHMgPSBwYXRocztcblx0XHRcblx0XHRjb25zdCBpZCA9IHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50MzJBcnJheSgxKSlbMF07XG5cdFx0YXdhaXQgdGF1cmkuaW52b2tlKFwicGx1Z2luOmZzLXdhdGNofHdhdGNoXCIsIHtcblx0XHRcdGlkLFxuXHRcdFx0cGF0aHM6IHdhdGNoUGF0aHMsXG5cdFx0XHRvcHRpb25zOiBvcHRzLFxuXHRcdH0pO1xuXHRcdFxuXHRcdGNvbnN0IHVubGlzdGVuID0gYXdhaXQgd2luZC5hcHBXaW5kb3cubGlzdGVuKFxuXHRcdFx0YHdhdGNoZXI6Ly9yYXctZXZlbnQvJHtpZH1gLFxuXHRcdFx0ZXZlbnQgPT5cblx0XHR7XG5cdFx0XHRjYWxsYmFja0ZuKGV2ZW50IGFzIFRhdXJpV2F0Y2hFdmVudCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIGFzeW5jICgpID0+XG5cdFx0e1xuXHRcdFx0YXdhaXQgdW53YXRjaChpZCk7XG5cdFx0XHR1bmxpc3RlbigpO1xuXHRcdH07XG5cdH1cblxuXHQvKiogQGludGVybmFsICovXG5cdGFzeW5jIGZ1bmN0aW9uIHdhdGNoSW1tZWRpYXRlKFxuXHRcdHBhdGhzOiBzdHJpbmcgfCBzdHJpbmdbXSxcblx0XHRvcHRpb25zOiBEZWJvdW5jZWRXYXRjaE9wdGlvbnMsXG5cdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBUYXVyaVdhdGNoRXZlbnQpID0+IHZvaWQpOiBQcm9taXNlPCgpID0+IFByb21pc2U8dm9pZD4+XG5cdHtcblx0XHRjb25zdCBvcHRzID0ge1xuXHRcdFx0cmVjdXJzaXZlOiBmYWxzZSxcblx0XHRcdC4uLm9wdGlvbnMsXG5cdFx0XHRkZWxheU1zOiBudWxsXG5cdFx0fTtcblx0XHRcblx0XHRjb25zdCB3YXRjaFBhdGhzID0gdHlwZW9mIHBhdGhzID09PSBcInN0cmluZ1wiID8gW3BhdGhzXSA6IHBhdGhzO1xuXHRcdGNvbnN0IGlkID0gd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQzMkFycmF5KDEpKVswXTtcblx0XHRcblx0XHRhd2FpdCB0YXVyaS5pbnZva2UoXCJwbHVnaW46ZnMtd2F0Y2h8d2F0Y2hcIiwge1xuXHRcdFx0aWQsXG5cdFx0XHRwYXRoczogd2F0Y2hQYXRocyxcblx0XHRcdG9wdGlvbnM6IG9wdHMsXG5cdFx0fSk7XG5cdFx0XG5cdFx0Y29uc3QgdW5saXN0ZW4gPSBhd2FpdCB3aW5kLmFwcFdpbmRvdy5saXN0ZW4oXG5cdFx0XHRgd2F0Y2hlcjovL3Jhdy1ldmVudC8ke2lkfWAsXG5cdFx0XHRldmVudCA9PlxuXHRcdHtcblx0XHRcdGNhbGxiYWNrRm4oZXZlbnQgYXMgVGF1cmlXYXRjaEV2ZW50KTtcblx0XHR9KTtcblx0XHRcblx0XHRyZXR1cm4gYXN5bmMgKCkgPT5cblx0XHR7XG5cdFx0XHRhd2FpdCB1bndhdGNoKGlkKTtcblx0XHRcdHVubGlzdGVuKCk7XG5cdFx0fTtcblx0fVxuXG5cdC8qKiAqL1xuXHRpbnRlcmZhY2UgVGF1cmlXYXRjaEV2ZW50XG5cdHtcblx0XHQvKiogRXhhbXBsZTogXCJ3YXRjaGVyOi8vZGVib3VuY2VkLWV2ZW50LzI5MDMwMzJcIiAqL1xuXHRcdHJlYWRvbmx5IGV2ZW50OiBzdHJpbmc7XG5cdFx0LyoqIEV4YW1wbGU6IFwibWFpblwiICovXG5cdFx0cmVhZG9ubHkgd2luZG93TGFiZWw6IHN0cmluZztcblx0XHQvKiogRXhhbXBsZTogL1VzZXJzL3VzZXIvTGlicmFyeS9BcHBsaWNhdGlvbiBTdXBwb3J0L2NvbS5hcHAvZmlsZW5hbWUudHh0ICovXG5cdFx0cmVhZG9ubHkgcGF5bG9hZDogeyBwYXlsb2FkOiBzdHJpbmc7IH07XG5cdFx0LyoqICovXG5cdFx0cmVhZG9ubHkgdHlwZTogXG5cdFx0XHRcIk5vdGljZVdyaXRlXCIgfFxuXHRcdFx0XCJOb3RpY2VSZW1vdmVcIiB8XG5cdFx0XHRcIkNyZWF0ZVwiIHxcblx0XHRcdFwiV3JpdGVcIiB8XG5cdFx0XHRcIkNobW9kXCIgfFxuXHRcdFx0XCJSZW1vdmVcIiB8XG5cdFx0XHRcIlJlbmFtZVwiIHxcblx0XHRcdFwiUmVzY2FuXCIgfFxuXHRcdFx0XCJFcnJvclwiO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlYWRvbmx5IGlkOiBudW1iZXI7XG5cdH1cblxuXHQvKiogQGludGVybmFsICovXG5cdGludGVyZmFjZSBXYXRjaE9wdGlvbnNcblx0e1xuXHRcdHJlY3Vyc2l2ZT86IGJvb2xlYW47XG5cdH1cblxuXHQvKiogQGludGVybmFsICovXG5cdGludGVyZmFjZSBEZWJvdW5jZWRXYXRjaE9wdGlvbnMgZXh0ZW5kcyBXYXRjaE9wdGlvbnNcblx0e1xuXHRcdGRlbGF5TXM/OiBudW1iZXI7XG5cdH1cblxuXHQvKiogQGludGVybmFsICovXG5cdGZ1bmN0aW9uIGdldE1ldGFkYXRhKHBhdGg6IHN0cmluZyk6IFByb21pc2U8TWV0YWRhdGE+XG5cdHtcblx0XHRyZXR1cm4gdGF1cmkuaW52b2tlKFwicGx1Z2luOmZzLWV4dHJhfG1ldGFkYXRhXCIsIHsgcGF0aCB9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBNZXRhZGF0YSBpbmZvcm1hdGlvbiBhYm91dCBhIGZpbGUuXG5cdCAqIFRoaXMgc3RydWN0dXJlIGlzIHJldHVybmVkIGZyb20gdGhlIGBtZXRhZGF0YWAgZnVuY3Rpb24gb3IgbWV0aG9kXG5cdCAqIGFuZCByZXByZXNlbnRzIGtub3duIG1ldGFkYXRhIGFib3V0IGEgZmlsZSBzdWNoIGFzIGl0cyBwZXJtaXNzaW9ucyxcblx0ICogc2l6ZSwgbW9kaWZpY2F0aW9uIHRpbWVzLCBldGMuXG5cdCAqL1xuXHRpbnRlcmZhY2UgTWV0YWRhdGFcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFRoZSBsYXN0IGFjY2VzcyB0aW1lIG9mIHRoaXMgbWV0YWRhdGEuXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgYWNjZXNzZWRBdDogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBjcmVhdGlvbiB0aW1lIGxpc3RlZCBpbiB0aGlzIG1ldGFkYXRhLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGNyZWF0ZWRBdDogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBsYXN0IG1vZGlmaWNhdGlvbiB0aW1lIGxpc3RlZCBpbiB0aGlzIG1ldGFkYXRhLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IG1vZGlmaWVkQXQ6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBgdHJ1ZWAgaWYgdGhpcyBtZXRhZGF0YSBpcyBmb3IgYSBkaXJlY3RvcnkuXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgaXNEaXI6IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogYHRydWVgIGlmIHRoaXMgbWV0YWRhdGEgaXMgZm9yIGEgcmVndWxhciBmaWxlLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGlzRmlsZTogYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBgdHJ1ZWAgaWYgdGhpcyBtZXRhZGF0YSBpcyBmb3IgYSBzeW1ib2xpYyBsaW5rLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGlzU3ltbGluazogYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgc2l6ZSBvZiB0aGUgZmlsZSwgaW4gYnl0ZXMsIHRoaXMgbWV0YWRhdGEgaXMgZm9yLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IHNpemU6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgcGVybWlzc2lvbnMgb2YgdGhlIGZpbGUgdGhpcyBtZXRhZGF0YSBpcyBmb3IuXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgcGVybWlzc2lvbnM6IFBlcm1pc3Npb25zO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBJRCBvZiB0aGUgZGV2aWNlIGNvbnRhaW5pbmcgdGhlIGZpbGUuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgZGV2PzogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBpbm9kZSBudW1iZXIuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgaW5vPzogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSByaWdodHMgYXBwbGllZCB0byB0aGlzIGZpbGUuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgbW9kZT86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgbnVtYmVyIG9mIGhhcmQgbGlua3MgcG9pbnRpbmcgdG8gdGhpcyBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IG5saW5rPzogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSB1c2VyIElEIG9mIHRoZSBvd25lciBvZiB0aGlzIGZpbGUuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgdWlkPzogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBncm91cCBJRCBvZiB0aGUgb3duZXIgb2YgdGhpcyBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGdpZD86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgZGV2aWNlIElEIG9mIHRoaXMgZmlsZSAoaWYgaXQgaXMgYSBzcGVjaWFsIG9uZSkuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgcmRldj86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgYmxvY2sgc2l6ZSBmb3IgZmlsZXN5c3RlbSBJL08uIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgYmxrc2l6ZT86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgbnVtYmVyIG9mIGJsb2NrcyBhbGxvY2F0ZWQgdG8gdGhlIGZpbGUsIGluIDUxMi1ieXRlIHVuaXRzLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGJsb2Nrcz86IG51bWJlcjtcblx0fVxuXG5cdC8qKiAqL1xuXHRpbnRlcmZhY2UgUGVybWlzc2lvbnNcblx0e1xuXHRcdC8qKlxuXHRcdCAqIGB0cnVlYCBpZiB0aGVzZSBwZXJtaXNzaW9ucyBkZXNjcmliZSBhIHJlYWRvbmx5ICh1bndyaXRhYmxlKSBmaWxlLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5OiBib29sZWFuO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSB1bmRlcmx5aW5nIHJhdyBgc3RfbW9kZWAgYml0cyB0aGF0IGNvbnRhaW4gdGhlIHN0YW5kYXJkIFVuaXhcblx0XHQgKiBwZXJtaXNzaW9ucyBmb3IgdGhpcyBmaWxlLlxuXHRcdCAqL1xuXHRcdG1vZGU/OiBudW1iZXI7XG5cdH1cblx0XHRcblx0e1xuXHRcdGxldCBwYXRoOiB0eXBlb2YgaW1wb3J0KFwiQHRhdXJpLWFwcHMvYXBpXCIpLnBhdGggfCBudWxsID0gbnVsbDtcblx0XHR0cnlcblx0XHR7XG5cdFx0XHRwYXRoID0gKGdsb2JhbFRoaXMgYXMgYW55KS5fX1RBVVJJX18ucGF0aCBhcyB0eXBlb2YgaW1wb3J0KFwiQHRhdXJpLWFwcHMvYXBpXCIpLnBhdGg7XG5cdFx0fVxuXHRcdGNhdGNoIChlKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUubG9nKFwid2l0aEdsb2JhbFRhdXJpIGlzIG5vdCBzZXRcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdFxuXHRcdGNvbnN0IHNlcCA9IHBhdGg/LnNlcCB8fCBcIi9cIjtcblx0XHRjb25zdCBjd2QgPSBcIi9cIjtcblx0XHRjb25zdCB0bXAgPSBcIi9cIjtcblx0XHRGaWxhLnNldHVwKEZpbGFUYXVyaSwgc2VwLCBjd2QsIHRtcCk7XG5cdFx0XG5cdFx0KGFzeW5jICgpID0+XG5cdFx0e1xuXHRcdFx0Ly8gVGhpcyBpcyBhIGh1Z2UgaGFjay4uLiBidXQgd2l0aG91dCB0aGlzLCB0aGUgc2V0dXAgbmVlZHNcblx0XHRcdC8vIHNvbWUgYXN5bmMgd2hpY2ggbWVhbnMgdGhhdCBpdCBjYW4ndCBiZSBkb25lXG5cdFx0XHRjb25zdCB0bXAgPSBhd2FpdCBwYXRoLmFwcENhY2hlRGlyKCk7XG5cdFx0XHRGaWxhLnNldHVwKEZpbGFUYXVyaSwgc2VwLCBjd2QsIHRtcCk7XG5cdFx0fSkoKTtcblx0fVxufSkoKTtcbiIsIlxuLyoqIEBpbnRlcm5hbCAqL1xuZGVjbGFyZSBjb25zdCBXRUI6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIFdFQiA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRPYmplY3QuYXNzaWduKGdsb2JhbFRoaXMsIHsgV0VCOiAhTk9ERSAmJiAhQ0FQQUNJVE9SICYmICFUQVVSSSAmJiB0eXBlb2YgaW5kZXhlZERCID09PSBcIm9iamVjdFwiIH0pXG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKCFXRUIpIHJldHVybjtcblx0XG5cdHR5cGUgS2V5dmEgPSB0eXBlb2YgaW1wb3J0KFwia2V5dmFqc1wiKTtcblx0XG5cdGNsYXNzIEZpbGFXZWIgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogQGludGVybmFsICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMga2V5dmE6IEtleXZhO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKGZpbGE6IEZpbGEpXG5cdFx0e1xuXHRcdFx0c3VwZXIoZmlsYSk7XG5cdFx0XHRGaWxhV2ViLmtleXZhIHx8PSBuZXcgS2V5dmEoeyBuYW1lOiBcImZpbGFcIiB9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZFRleHQoKVxuXHRcdHtcblx0XHRcdHJldHVybiBhd2FpdCBGaWxhV2ViLmtleXZhLmdldDxzdHJpbmc+KHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZEJpbmFyeSgpOiBQcm9taXNlPEFycmF5QnVmZmVyPlxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0cmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgP1xuXHRcdFx0XHR2YWx1ZSA6XG5cdFx0XHRcdG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWREaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdGNvbnN0IHJhbmdlID0gS2V5dmEucHJlZml4KHRoaXMuZmlsYS5wYXRoICsgXCIvXCIpO1xuXHRcdFx0Y29uc3QgY29udGVudHMgPSBhd2FpdCBGaWxhV2ViLmtleXZhLmVhY2goeyByYW5nZSB9LCBcImtleXNcIik7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qga2V5IG9mIGNvbnRlbnRzKVxuXHRcdFx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKGtleSkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdGxldCBjdXJyZW50ID0gdGhpcy5maWxhLnVwKCk7XG5cdFx0XHRjb25zdCBtaXNzaW5nRm9sZGVyczogRmlsYVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoOzspXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChhd2FpdCBjdXJyZW50LmV4aXN0cygpKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0bWlzc2luZ0ZvbGRlcnMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChjdXJyZW50LnVwKCkucGF0aCA9PT0gY3VycmVudC5wYXRoKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQudXAoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmb2xkZXIgb2YgbWlzc2luZ0ZvbGRlcnMpXG5cdFx0XHRcdGF3YWl0IGZvbGRlci53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0XG5cdFx0XHRpZiAob3B0aW9ucz8uYXBwZW5kKVxuXHRcdFx0XHR0ZXh0ID0gKFwiXCIgKyAoYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpIHx8IFwiXCIpKSArIHRleHQ7XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCB0ZXh0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCBhcnJheUJ1ZmZlcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGlmIChhd2FpdCB0aGlzLmV4aXN0cygpKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBIGZpbGUgYWxyZWFkeSBleGlzdHMgYXQgdGhpcyBsb2NhdGlvbi5cIik7XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCBudWxsKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdFx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0YXN5bmMgd3JpdGVTeW1saW5rKGF0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdFx0ICovXG5cdFx0YXN5bmMgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPlxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJhbmdlID0gS2V5dmEucHJlZml4KHRoaXMuZmlsYS5wYXRoICsgXCIvXCIpO1xuXHRcdFx0XHRhd2FpdCBGaWxhV2ViLmtleXZhLmRlbGV0ZShyYW5nZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuZGVsZXRlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgbW92ZSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgY29weSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0d2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sXG5cdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEsIHNlY29uZGFyeUZpbGE/OiBGaWxhKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHRcdHJldHVybiAoKSA9PiB7fTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVuYW1lKG5ld05hbWU6IHN0cmluZylcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0cmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRNb2RpZmllZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0Q3JlYXRlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGlzRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpID09PSBudWxsO1xuXHRcdH1cblx0fVxuXHRcblx0RmlsYS5zZXR1cChGaWxhV2ViLCBcIi9cIiwgXCIvXCIsIFwiL19fdGVtcC9cIik7XG59KSgpOyJdfQ==