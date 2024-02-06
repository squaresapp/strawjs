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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsYS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2ZpbGEtYWJzdHJhY3QvRmlsYS50cyIsIi4uL2ZpbGEtY2FwYWNpdG9yL0ZpbGFDYXBhY2l0b3IudHMiLCIuLi9maWxhLW5vZGUvRmlsYU5vZGUudHMiLCIuLi9maWxhLXRhdXJpL0ZpbGFUYXVyaS50cyIsIi4uL2ZpbGEtd2ViL0ZpbGFXZWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE1BQU0sSUFBSTtJQUVUOzs7T0FHRztJQUNILE1BQU0sQ0FBVSxXQUFXLEdBQUcsQ0FBQyxHQUFHLEVBQUU7UUFFbkMsTUFBZSxXQUFXO1lBRU07WUFBL0IsWUFBK0IsSUFBVTtnQkFBVixTQUFJLEdBQUosSUFBSSxDQUFNO1lBQUksQ0FBQztTQXdCOUM7UUFFRCxPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDLENBQUMsRUFBRSxDQUFDO0lBRUw7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBZ0MsRUFBRSxHQUFXLEVBQUUsR0FBVyxFQUFFLElBQVk7UUFFcEYsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSyxDQUFDO0lBQ3pCLENBQUM7SUFFTyxNQUFNLENBQUMsT0FBTyxDQUEwQjtJQUVoRDs7T0FFRztJQUNILE1BQU0sS0FBSyxHQUFHO1FBRWIsT0FBTyxJQUFJLENBQUMsSUFBa0IsQ0FBQztJQUNoQyxDQUFDO0lBQ08sTUFBTSxDQUFDLElBQUksR0FBVyxHQUFHLENBQUM7SUFFbEM7O09BRUc7SUFDSCxNQUFNLEtBQUssR0FBRztRQUViLElBQUksT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVE7WUFDaEMsT0FBTyxJQUFJLENBQUMsSUFBSSxHQUFHLElB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XG57XG5cdC8qKlxuXHQgKiBAaW50ZXJuYWxcblx0ICogQWJzdHJhY3QgY2xhc3MgdGhhdCBtdXN0IGJlIGltcGxlbWVudGVkIGJ5IEZpbGEgYmFja2VuZHMuXG5cdCAqL1xuXHRzdGF0aWMgcmVhZG9ubHkgRmlsYUJhY2tlbmQgPSAoKCkgPT5cblx0e1xuXHRcdGFic3RyYWN0IGNsYXNzIEZpbGFCYWNrZW5kXG5cdFx0e1xuXHRcdFx0Y29uc3RydWN0b3IocHJvdGVjdGVkIHJlYWRvbmx5IGZpbGE6IEZpbGEpIHsgfVxuXHRcdFx0XG5cdFx0XHRhYnN0cmFjdCByZWFkVGV4dCgpOiBQcm9taXNlPHN0cmluZz47XG5cdFx0XHRhYnN0cmFjdCByZWFkQmluYXJ5KCk6IFByb21pc2U8QXJyYXlCdWZmZXI+O1xuXHRcdFx0YWJzdHJhY3QgcmVhZERpcmVjdG9yeSgpOiBQcm9taXNlPEZpbGFbXT47XG5cdFx0XHRhYnN0cmFjdCB3cml0ZVRleHQodGV4dDogc3RyaW5nLCBvcHRpb25zPzogRmlsYS5JV3JpdGVUZXh0T3B0aW9ucyk6IFByb21pc2U8dm9pZD47XG5cdFx0XHRhYnN0cmFjdCB3cml0ZUJpbmFyeShidWZmZXI6IEFycmF5QnVmZmVyKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdGFic3RyYWN0IHdyaXRlRGlyZWN0b3J5KCk6IFByb21pc2U8dm9pZD47XG5cdFx0XHRhYnN0cmFjdCB3cml0ZVN5bWxpbmsoYXQ6IEZpbGEpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3QgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPjtcblx0XHRcdGFic3RyYWN0IG1vdmUodGFyZ2V0OiBGaWxhKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdGFic3RyYWN0IGNvcHkodGFyZ2V0OiBGaWxhKTogUHJvbWlzZTx2b2lkPjtcblx0XHRcdFxuXHRcdFx0YWJzdHJhY3Qgd2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRcdHJlY3Vyc2l2ZTogYm9vbGVhbiwgXG5cdFx0XHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZCk6ICgpID0+IHZvaWQ7XG5cdFx0XHRcblx0XHRcdGFic3RyYWN0IHJlbmFtZShuZXdOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+O1xuXHRcdFx0YWJzdHJhY3QgZXhpc3RzKCk6IFByb21pc2U8Ym9vbGVhbj47XG5cdFx0XHRhYnN0cmFjdCBnZXRTaXplKCk6IFByb21pc2U8bnVtYmVyPjtcblx0XHRcdGFic3RyYWN0IGdldE1vZGlmaWVkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+O1xuXHRcdFx0YWJzdHJhY3QgZ2V0Q3JlYXRlZFRpY2tzKCk6IFByb21pc2U8bnVtYmVyPjtcblx0XHRcdGFic3RyYWN0IGdldEFjY2Vzc2VkVGlja3MoKTogUHJvbWlzZTxudW1iZXI+O1xuXHRcdFx0YWJzdHJhY3QgaXNEaXJlY3RvcnkoKTogUHJvbWlzZTxib29sZWFuPjtcblx0XHR9XG5cdFx0XG5cdFx0cmV0dXJuIEZpbGFCYWNrZW5kO1xuXHR9KSgpO1xuXHRcblx0LyoqXG5cdCAqIEBpbnRlcm5hbFxuXHQgKiBFYWNoIGJhY2tlbmQgY2FsbHMgdGhpcyBtZXRob2QgdG8gcGVyZm9ybSB0aGUgc2V0dXAgZnVuY3Rpb25zLlxuXHQgKiBUaGlzIGlzIHRoZSBpbnRlcm5hbCAuc2V0dXAoKSBvdmVybG9hZCB0aGF0IGlzIGNhbGxlZCBieSBlYWNoIGltcGxlbWVudG9yLlxuXHQgKi9cblx0c3RhdGljIHNldHVwKGJhY2tlbmQ6IHR5cGVvZiBGaWxhLkZpbGFCYWNrZW5kLCBzZXA6IHN0cmluZywgY3dkOiBzdHJpbmcsIHRlbXA6IHN0cmluZylcblx0e1xuXHRcdHRoaXMuYmFja2VuZCA9IGJhY2tlbmQ7XG5cdFx0dGhpcy5fc2VwID0gc2VwIHx8IFwiL1wiO1xuXHRcdHRoaXMuX2N3ZCA9IGN3ZCE7XG5cdFx0dGhpcy5fdGVtcG9yYXJ5ID0gdGVtcCE7XG5cdH1cblx0XG5cdHByaXZhdGUgc3RhdGljIGJhY2tlbmQ6IHR5cGVvZiBGaWxhLkZpbGFCYWNrZW5kO1xuXHRcblx0LyoqXG5cdCAqIFBhdGggc2VwYXJhdG9yLlxuXHQgKi9cblx0c3RhdGljIGdldCBzZXAoKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuX3NlcCBhcyBcIlxcXFxcIiB8IFwiL1wiO1xuXHR9XG5cdHByaXZhdGUgc3RhdGljIF9zZXA6IHN0cmluZyA9IFwiL1wiO1xuXHRcblx0LyoqXG5cdCAqIEdldHMgdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3Rvcnkgb2YgdGhlIHByb2Nlc3MuXG5cdCAqL1xuXHRzdGF0aWMgZ2V0IGN3ZCgpXG5cdHtcblx0XHRpZiAodHlwZW9mIHRoaXMuX2N3ZCA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHJldHVybiB0aGlzLl9jd2QgPSBuZXcgRmlsYSh0aGlzLl9jd2QpO1xuXHRcdFxuXHRcdHJldHVybiB0aGlzLl9jd2Q7XG5cdH1cblx0cHJpdmF0ZSBzdGF0aWMgX2N3ZDogRmlsYSB8IHN0cmluZyA9IFwiXCI7XG5cdFxuXHQvKipcblx0ICogXG5cdCAqL1xuXHRzdGF0aWMgZ2V0IHRlbXBvcmFyeSgpXG5cdHtcblx0XHRpZiAodHlwZW9mIHRoaXMuX3RlbXBvcmFyeSA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHJldHVybiB0aGlzLl90ZW1wb3JhcnkgPSBuZXcgRmlsYSh0aGlzLl90ZW1wb3JhcnkpO1xuXHRcdFxuXHRcdHJldHVybiB0aGlzLl90ZW1wb3Jhcnk7XG5cdH1cblx0cHJpdmF0ZSBzdGF0aWMgX3RlbXBvcmFyeTogRmlsYSB8IHN0cmluZyA9IFwiXCI7XG5cdFxuXHQvKipcblx0ICogUmV0dXJucyBhIEZpbGEgaW5zdGFuY2UgZnJvbSB0aGUgc3BlY2lmaWVkIHBhdGggaW4gdGhlIGNhc2Ugd2hlblxuXHQgKiBhIHN0cmluZyBpcyBwcm92aWRlZCwgb3IgcmV0dXJucyB0aGUgRmlsYSBpbnN0YW5jZSBhcy1pcyB3aGVuIGEgRmlsYVxuXHQgKiBvYmplY3QgaXMgcHJvdmlkZWQuXG5cdCAqL1xuXHRzdGF0aWMgZnJvbSh2aWE6IHN0cmluZyB8IEZpbGEpXG5cdHtcblx0XHRyZXR1cm4gdHlwZW9mIHZpYSA9PT0gXCJzdHJpbmdcIiA/IG5ldyBGaWxhKHZpYSkgOiB2aWE7XG5cdH1cblx0XG5cdC8qKiAqL1xuXHRjb25zdHJ1Y3RvciguLi5jb21wb25lbnRzOiBzdHJpbmdbXSlcblx0e1xuXHRcdHRoaXMuY29tcG9uZW50cyA9IGNvbXBvbmVudHM7XG5cdFx0Y29tcG9uZW50cyA9IGNvbXBvbmVudHMuZmlsdGVyKHMgPT4gISFzKTtcblx0XHRcblx0XHRpZiAoY29tcG9uZW50cy5qb2luKFwiXCIpICE9PSBcIi9cIilcblx0XHR7XG5cdFx0XHRpZiAoY29tcG9uZW50cy5sZW5ndGggPT09IDAgfHwgY29tcG9uZW50c1swXS5zdGFydHNXaXRoKFwiLlwiKSlcblx0XHRcdFx0Y29tcG9uZW50cy51bnNoaWZ0KEZpbGEuY3dkLnBhdGgpO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGxldCBpID0gLTE7ICsraSA8IGNvbXBvbmVudHMubGVuZ3RoOylcblx0XHRcdFx0Y29tcG9uZW50cy5zcGxpY2UoaSwgMSwgLi4uY29tcG9uZW50c1tpXS5zcGxpdChGaWxhLnNlcCkpO1xuXHRcdFx0XG5cdFx0XHRjb21wb25lbnRzID0gY29tcG9uZW50cy5maWx0ZXIocyA9PiAhIXMpO1xuXHRcdFx0Y29tcG9uZW50cyA9IEZpbGEubm9ybWFsaXplKGNvbXBvbmVudHMuam9pbihGaWxhLnNlcCkpLnNwbGl0KEZpbGEuc2VwKTtcblx0XHR9XG5cdFx0XG5cdFx0bGV0IGJhY2s6IEluc3RhbmNlVHlwZTx0eXBlb2YgRmlsYS5GaWxhQmFja2VuZD47XG5cdFx0Ly9AdHMtaWdub3JlXG5cdFx0YmFjayA9IG5ldyBGaWxhLmJhY2tlbmQodGhpcyk7XG5cdFx0dGhpcy5iYWNrID0gYmFjaztcblx0fVxuXHRcblx0cmVhZG9ubHkgY29tcG9uZW50cztcblx0cHJpdmF0ZSByZWFkb25seSBiYWNrOiBJbnN0YW5jZVR5cGU8dHlwZW9mIEZpbGEuRmlsYUJhY2tlbmQ+O1xuXHRcblx0LyoqICovXG5cdHJlYWRUZXh0KCk6IFByb21pc2U8c3RyaW5nPiB7IHJldHVybiB0aGlzLmJhY2sucmVhZFRleHQoKTsgfVxuXHRcblx0LyoqICovXG5cdHJlYWRCaW5hcnkoKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4geyByZXR1cm4gdGhpcy5iYWNrLnJlYWRCaW5hcnkoKTsgfVxuXHRcblx0LyoqICovXG5cdHJlYWREaXJlY3RvcnkoKTogUHJvbWlzZTxGaWxhW10+IHsgcmV0dXJuIHRoaXMuYmFjay5yZWFkRGlyZWN0b3J5KCk7IH1cblx0XG5cdC8qKiAqL1xuXHR3cml0ZVRleHQodGV4dDogc3RyaW5nLCBvcHRpb25zPzogRmlsYS5JV3JpdGVUZXh0T3B0aW9ucyk6IFByb21pc2U8dm9pZD5cblx0e1xuXHRcdHJldHVybiB0aGlzLmJhY2sud3JpdGVUZXh0KHRleHQsIG9wdGlvbnMpO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0d3JpdGVCaW5hcnkoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IFByb21pc2U8dm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLndyaXRlQmluYXJ5KGJ1ZmZlcik7IH1cblx0XG5cdC8qKiAqL1xuXHR3cml0ZURpcmVjdG9yeSgpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay53cml0ZURpcmVjdG9yeSgpOyB9XG5cdFxuXHQvKipcblx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdCAqIEZpbGEgb2JqZWN0LCB0byB0aGUgbG9jYXRpb24gc3BlY2lmaWVkIGJ5IHRoZSBjdXJyZW50IEZpbGEgb2JqZWN0LlxuXHQgKi9cblx0d3JpdGVTeW1saW5rKGF0OiBGaWxhKTogUHJvbWlzZTx2b2lkPiB7IHJldHVybiB0aGlzLmJhY2sud3JpdGVTeW1saW5rKGF0KTsgfVxuXHRcblx0LyoqXG5cdCAqIERlbGV0ZXMgdGhlIGZpbGUgb3IgZGlyZWN0b3J5IHRoYXQgdGhpcyBGaWxhIG9iamVjdCByZXByZXNlbnRzLlxuXHQgKi9cblx0ZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPiB7IHJldHVybiB0aGlzLmJhY2suZGVsZXRlKCk7IH1cblx0XG5cdC8qKiAqL1xuXHRtb3ZlKHRhcmdldDogRmlsYSk6IFByb21pc2U8dm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLm1vdmUodGFyZ2V0KTsgfVxuXHRcblx0LyoqXG5cdCAqIENvcGllcyB0aGUgZmlsZSB0byB0aGUgc3BlY2lmaWVkIGxvY2F0aW9uLCBhbmQgY3JlYXRlcyBhbnlcblx0ICogbmVjZXNzYXJ5IGRpcmVjdG9yaWVzIGFsb25nIHRoZSB3YXkuXG5cdCAqL1xuXHRjb3B5KHRhcmdldDogRmlsYSk6IFByb21pc2U8dm9pZD4geyByZXR1cm4gdGhpcy5iYWNrLmNvcHkodGFyZ2V0KTsgfVxuXHRcblx0LyoqXG5cdCAqIFJlY3Vyc2l2ZWx5IHdhdGNoZXMgdGhpcyBmb2xkZXIsIGFuZCBhbGwgbmVzdGVkIGZpbGVzIGNvbnRhaW5lZFxuXHQgKiB3aXRoaW4gYWxsIHN1YmZvbGRlcnMuIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHRlcm1pbmF0ZXNcblx0ICogdGhlIHdhdGNoIHNlcnZpY2Ugd2hlbiBjYWxsZWQuXG5cdCAqL1xuXHR3YXRjaChcblx0XHRyZWN1cnNpdmU6IFwicmVjdXJzaXZlXCIsXG5cdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKTogKCkgPT4gdm9pZDtcblx0LyoqXG5cdCAqIFdhdGNoZXMgZm9yIGNoYW5nZXMgdG8gdGhlIHNwZWNpZmllZCBmaWxlIG9yIGZvbGRlci4gUmV0dXJuc1xuXHQgKiBhIGZ1bmN0aW9uIHRoYXQgdGVybWluYXRlcyB0aGUgd2F0Y2ggc2VydmljZSB3aGVuIGNhbGxlZC5cblx0ICovXG5cdHdhdGNoKFxuXHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZCk6ICgpID0+IHZvaWQ7XG5cdC8qKiAqL1xuXHR3YXRjaChhOiBhbnksIGI/OiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpXG5cdHtcblx0XHRjb25zdCByZWN1cnNpdmUgPSBhID09PSBcInJlY3Vyc2l2ZVwiO1xuXHRcdGNvbnN0IGNhbGxiYWNrRm4gPSBiIHx8IGE7XG5cdFx0cmV0dXJuIHRoaXMud2F0Y2hQcm90ZWN0ZWQocmVjdXJzaXZlLCBjYWxsYmFja0ZuKTtcblx0fVxuXHRcblx0LyoqICovXG5cdHByb3RlY3RlZCB3YXRjaFByb3RlY3RlZChcblx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sIFxuXHRcdGNhbGxiYWNrRm46IChldmVudDogRmlsYS5FdmVudCwgZmlsYTogRmlsYSkgPT4gdm9pZCk6ICgpID0+IHZvaWRcblx0e1xuXHRcdHJldHVybiB0aGlzLmJhY2sud2F0Y2hQcm90ZWN0ZWQocmVjdXJzaXZlLCBjYWxsYmFja0ZuKTtcblx0fVxuXHRcblx0LyoqICovXG5cdHJlbmFtZShuZXdOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHsgcmV0dXJuIHRoaXMuYmFjay5yZW5hbWUobmV3TmFtZSk7IH1cblx0XG5cdC8qKiAqL1xuXHRleGlzdHMoKTogUHJvbWlzZTxib29sZWFuPiB7IHJldHVybiB0aGlzLmJhY2suZXhpc3RzKCk7IH1cblx0XG5cdC8qKiAqL1xuXHRnZXRTaXplKCk6IFByb21pc2U8bnVtYmVyPiB7IHJldHVybiB0aGlzLmJhY2suZ2V0U2l6ZSgpOyB9XG5cdFxuXHQvKiogKi9cblx0Z2V0TW9kaWZpZWRUaWNrcygpOiBQcm9taXNlPG51bWJlcj4geyByZXR1cm4gdGhpcy5iYWNrLmdldE1vZGlmaWVkVGlja3MoKTsgfVxuXHRcblx0LyoqICovXG5cdGdldENyZWF0ZWRUaWNrcygpOiBQcm9taXNlPG51bWJlcj4geyByZXR1cm4gdGhpcy5iYWNrLmdldENyZWF0ZWRUaWNrcygpOyB9XG5cdFxuXHQvKiogKi9cblx0Z2V0QWNjZXNzZWRUaWNrcygpOiBQcm9taXNlPG51bWJlcj4geyByZXR1cm4gdGhpcy5iYWNrLmdldEFjY2Vzc2VkVGlja3MoKTsgfVxuXHRcblx0LyoqICovXG5cdGlzRGlyZWN0b3J5KCk6IFByb21pc2U8Ym9vbGVhbj4geyByZXR1cm4gdGhpcy5iYWNrLmlzRGlyZWN0b3J5KCk7IH1cblx0XG5cdC8qKlxuXHQgKiBJbiB0aGUgY2FzZSB3aGVuIHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cyBhIGZpbGUsIHRoaXMgbWV0aG9kIHJldHVybnMgYSBcblx0ICogRmlsYSBvYmplY3QgdGhhdCByZXByZXNlbnRzIHRoZSBkaXJlY3RvcnkgdGhhdCBjb250YWlucyBzYWlkIGZpbGUuXG5cdCAqIFxuXHQgKiBJbiB0aGUgY2FzZSB3aGVuIHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cyBhIGRpcmVjdG9yeSwgdGhpcyBtZXRob2Rcblx0ICogcmV0dXJucyB0aGUgY3VycmVudCBGaWxhIG9iamVjdCBhcy1pcy5cblx0ICovXG5cdGFzeW5jIGdldERpcmVjdG9yeSgpOiBQcm9taXNlPEZpbGE+XG5cdHtcblx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XG5cdFx0cmV0dXJuIG5ldyBGaWxhKC4uLnRoaXMudXAoKS5jb21wb25lbnRzKTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEdldHMgdGhlIGZpbGUgb3IgZGlyZWN0b3J5IG5hbWUgb2YgdGhlIGZpbGUgc3lzdGVtIG9iamVjdCBiZWluZ1xuXHQgKiByZXByZXNlbnRlZCBieSB0aGlzIEZpbGEgb2JqZWN0LlxuXHQgKi9cblx0Z2V0IG5hbWUoKVxuXHR7XG5cdFx0cmV0dXJuIHRoaXMuY29tcG9uZW50cy5hdCgtMSkgfHwgXCJcIjtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEdldCB0aGUgZmlsZSBleHRlbnNpb24gb2YgdGhlIGZpbGUgYmVpbmcgcmVwcmVzZW50ZWQgYnkgdGhpc1xuXHQgKiBGaWxhIG9iamVjdCwgd2l0aCB0aGUgXCIuXCIgY2hhcmFjdGVyLlxuXHQgKi9cblx0Z2V0IGV4dGVuc2lvbigpXG5cdHtcblx0XHRjb25zdCBuYW1lID0gdGhpcy5uYW1lO1xuXHRcdGNvbnN0IGxhc3REb3QgPSBuYW1lLmxhc3RJbmRleE9mKFwiLlwiKTtcblx0XHRyZXR1cm4gbGFzdERvdCA8IDAgPyBcIlwiIDogbmFtZS5zbGljZShsYXN0RG90KTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIEdldHMgdGhlIGZ1bGx5LXF1YWxpZmllZCBwYXRoLCBpbmNsdWRpbmcgYW55IGZpbGUgbmFtZSB0byB0aGVcblx0ICogZmlsZSBzeXN0ZW0gb2JqZWN0IGJlaW5nIHJlcHJlc2VudGVkIGJ5IHRoaXMgRmlsYSBvYmplY3QuXG5cdCAqL1xuXHRnZXQgcGF0aCgpXG5cdHtcblx0XHRyZXR1cm4gRmlsYS5zZXAgKyBGaWxhLmpvaW4oLi4udGhpcy5jb21wb25lbnRzKTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFJldHVybnMgYSBGaWxhIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgdGhlIGZpcnN0IG9yIG50aCBjb250YWluaW5nXG5cdCAqIGRpcmVjdG9yeSBvZiB0aGUgb2JqZWN0IHRoYXQgdGhpcyBGaWxhIG9iamVjdCByZXByZXNlbnRzLlxuXHQgKiBSZXR1cm5zIHRoZSB0aGlzIHJlZmVyZW5jZSBpbiB0aGUgY2FzZSB3aGVuIHRoZSBcblx0ICovXG5cdHVwKGNvdW50ID0gMSlcblx0e1xuXHRcdGlmICh0aGlzLmNvbXBvbmVudHMubGVuZ3RoIDwgMilcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFxuXHRcdGNvbnN0IHBhcmVudENvbXBvbmVudHMgPSB0aGlzLmNvbXBvbmVudHMuc2xpY2UoMCwgLWNvdW50KTtcblx0XHRyZXR1cm4gcGFyZW50Q29tcG9uZW50cy5sZW5ndGggPiAwID9cblx0XHRcdG5ldyBGaWxhKC4uLnBhcmVudENvbXBvbmVudHMpIDpcblx0XHRcdG5ldyBGaWxhKFwiL1wiKTtcblx0fVxuXHRcblx0LyoqXG5cdCAqIFNlYXJjaGVzIHVwd2FyZCB0aHJvdWdoIHRoZSBmaWxlIHN5c3RlbSBhbmNlc3RyeSBmb3IgYSBuZXN0ZWQgZmlsZS5cblx0ICovXG5cdGFzeW5jIHVwc2NhbihyZWxhdGl2ZUZpbGVOYW1lOiBzdHJpbmcpXG5cdHtcblx0XHRsZXQgYW5jZXN0cnkgPSB0aGlzIGFzIEZpbGE7XG5cdFx0XG5cdFx0ZG9cblx0XHR7XG5cdFx0XHRjb25zdCBtYXliZSA9IGFuY2VzdHJ5LmRvd24ocmVsYXRpdmVGaWxlTmFtZSk7XG5cdFx0XHRpZiAoYXdhaXQgbWF5YmUuZXhpc3RzKCkpXG5cdFx0XHRcdHJldHVybiBtYXliZTtcblx0XHRcdFxuXHRcdFx0aWYgKGFuY2VzdHJ5LmNvbXBvbmVudHMubGVuZ3RoID09PSAxKVxuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0YW5jZXN0cnkgPSBhbmNlc3RyeS51cCgpO1xuXHRcdH1cblx0XHR3aGlsZSAoYW5jZXN0cnkuY29tcG9uZW50cy5sZW5ndGggPiAwKTtcblx0XHRcblx0XHRyZXR1cm4gbnVsbCBhcyBhbnkgYXMgRmlsYSB8IG51bGw7XG5cdH1cblx0XG5cdC8qKlxuXHQgKiBSZXR1cm5zIGEgRmlsYSBvYmplY3QgdGhhdCByZXByZXNlbnRzIGEgZmlsZSBvciBkaXJlY3RvcnkgbmVzdGVkXG5cdCAqIHdpdGhpbiB0aGUgY3VycmVudCBGaWxhIG9iamVjdCAod2hpY2ggbXVzdCBiZSBhIGRpcmVjdG9yeSkuXG5cdCAqL1xuXHRkb3duKC4uLmFkZGl0aW9uYWxDb21wb25lbnRzOiBzdHJpbmdbXSlcblx0e1xuXHRcdHJldHVybiBuZXcgRmlsYSguLi50aGlzLmNvbXBvbmVudHMsIC4uLmFkZGl0aW9uYWxDb21wb25lbnRzKTtcblx0fVxufVxuXG5uYW1lc3BhY2UgRmlsYVxue1xuXHQvKiogKi9cblx0ZXhwb3J0IGludGVyZmFjZSBJV3JpdGVUZXh0T3B0aW9uc1xuXHR7XG5cdFx0cmVhZG9ubHkgYXBwZW5kOiBib29sZWFuO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIGpvaW4oLi4uYXJnczogc3RyaW5nW10pXG5cdHtcblx0XHRpZiAoYXJncy5sZW5ndGggPT09IDApXG5cdFx0XHRyZXR1cm4gXCIuXCI7XG5cdFx0XG5cdFx0bGV0IGpvaW5lZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXHRcdFxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7ICsraSlcblx0XHR7XG5cdFx0XHRsZXQgYXJnID0gYXJnc1tpXTtcblx0XHRcdFxuXHRcdFx0aWYgKGFyZy5sZW5ndGggPiAwKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoam9pbmVkID09PSB1bmRlZmluZWQpXG5cdFx0XHRcdFx0am9pbmVkID0gYXJnO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0am9pbmVkICs9IFwiL1wiICsgYXJnO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHRpZiAoam9pbmVkID09PSB1bmRlZmluZWQpXG5cdFx0XHRyZXR1cm4gXCIuXCI7XG5cdFx0XG5cdFx0cmV0dXJuIG5vcm1hbGl6ZShqb2luZWQpO1xuXHR9XG5cdFxuXHQvKiogKi9cblx0ZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZShwYXRoOiBzdHJpbmcpXG5cdHtcblx0XHRpZiAocGF0aC5sZW5ndGggPT09IDApXG5cdFx0XHRyZXR1cm4gXCIuXCI7XG5cdFx0XG5cdFx0Y29uc3QgaXNBYnNvbHV0ZSA9IHBhdGguY2hhckNvZGVBdCgwKSA9PT0gQ2hhci5zbGFzaDtcblx0XHRjb25zdCB0cmFpbGluZ1NlcGFyYXRvciA9IHBhdGguY2hhckNvZGVBdChwYXRoLmxlbmd0aCAtIDEpID09PSBDaGFyLnNsYXNoO1xuXHRcdFxuXHRcdC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuXHRcdHBhdGggPSBub3JtYWxpemVTdHJpbmdQb3NpeChwYXRoLCAhaXNBYnNvbHV0ZSk7XG5cdFx0XG5cdFx0aWYgKHBhdGgubGVuZ3RoID09PSAwICYmICFpc0Fic29sdXRlKVxuXHRcdFx0cGF0aCA9IFwiLlwiO1xuXHRcdFxuXHRcdGlmIChwYXRoLmxlbmd0aCA+IDAgJiYgdHJhaWxpbmdTZXBhcmF0b3IpXG5cdFx0XHRwYXRoICs9IEZpbGEuc2VwO1xuXHRcdFxuXHRcdGlmIChpc0Fic29sdXRlKVxuXHRcdFx0cmV0dXJuIEZpbGEuc2VwICsgcGF0aDtcblx0XHRcblx0XHRyZXR1cm4gcGF0aDtcblx0fVxuXHRcblx0LyoqICovXG5cdGZ1bmN0aW9uIG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHBhdGg6IHN0cmluZywgYWxsb3dBYm92ZVJvb3Q6IGJvb2xlYW4pXG5cdHtcblx0XHRsZXQgcmVzID0gXCJcIjtcblx0XHRsZXQgbGFzdFNlZ21lbnRMZW5ndGggPSAwO1xuXHRcdGxldCBsYXN0U2xhc2ggPSAtMTtcblx0XHRsZXQgZG90cyA9IDA7XG5cdFx0bGV0IGNvZGU7XG5cdFx0XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPD0gcGF0aC5sZW5ndGg7ICsraSlcblx0XHR7XG5cdFx0XHRpZiAoaSA8IHBhdGgubGVuZ3RoKVxuXHRcdFx0XHRjb2RlID0gcGF0aC5jaGFyQ29kZUF0KGkpO1xuXHRcdFx0XG5cdFx0XHRlbHNlIGlmIChjb2RlID09PSBDaGFyLnNsYXNoKVxuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0ZWxzZVxuXHRcdFx0XHRjb2RlID0gQ2hhci5zbGFzaDtcblx0XHRcdFxuXHRcdFx0aWYgKGNvZGUgPT09IENoYXIuc2xhc2gpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChsYXN0U2xhc2ggPT09IGkgLSAxIHx8IGRvdHMgPT09IDEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQvLyBOT09QXG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAobGFzdFNsYXNoICE9PSBpIC0gMSAmJiBkb3RzID09PSAyKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKHJlcy5sZW5ndGggPCAyIHx8IFxuXHRcdFx0XHRcdFx0bGFzdFNlZ21lbnRMZW5ndGggIT09IDIgfHwgXG5cdFx0XHRcdFx0XHRyZXMuY2hhckNvZGVBdChyZXMubGVuZ3RoIC0gMSkgIT09IENoYXIuZG90IHx8XG5cdFx0XHRcdFx0XHRyZXMuY2hhckNvZGVBdChyZXMubGVuZ3RoIC0gMikgIT09IENoYXIuZG90KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmIChyZXMubGVuZ3RoID4gMilcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0bGV0IGxhc3RTbGFzaEluZGV4ID0gcmVzLmxhc3RJbmRleE9mKEZpbGEuc2VwKTtcblx0XHRcdFx0XHRcdFx0aWYgKGxhc3RTbGFzaEluZGV4ICE9PSByZXMubGVuZ3RoIC0gMSlcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdGlmIChsYXN0U2xhc2hJbmRleCA9PT0gLTEpXG5cdFx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVzID0gXCJcIjtcblx0XHRcdFx0XHRcdFx0XHRcdGxhc3RTZWdtZW50TGVuZ3RoID0gMDtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0XHRcdHJlcyA9IHJlcy5zbGljZSgwLCBsYXN0U2xhc2hJbmRleCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRsYXN0U2VnbWVudExlbmd0aCA9IHJlcy5sZW5ndGggLSAxIC0gcmVzLmxhc3RJbmRleE9mKEZpbGEuc2VwKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0bGFzdFNsYXNoID0gaTtcblx0XHRcdFx0XHRcdFx0XHRkb3RzID0gMDtcblx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAocmVzLmxlbmd0aCA9PT0gMiB8fCByZXMubGVuZ3RoID09PSAxKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRyZXMgPSBcIlwiO1xuXHRcdFx0XHRcdFx0XHRsYXN0U2VnbWVudExlbmd0aCA9IDA7XG5cdFx0XHRcdFx0XHRcdGxhc3RTbGFzaCA9IGk7XG5cdFx0XHRcdFx0XHRcdGRvdHMgPSAwO1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGFsbG93QWJvdmVSb290KVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmIChyZXMubGVuZ3RoID4gMClcblx0XHRcdFx0XHRcdFx0cmVzICs9IFwiLy4uXCI7XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHJlcyA9IFwiLi5cIjtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0bGFzdFNlZ21lbnRMZW5ndGggPSAyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAocmVzLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0XHRyZXMgKz0gRmlsYS5zZXAgKyBwYXRoLnNsaWNlKGxhc3RTbGFzaCArIDEsIGkpO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdHJlcyA9IHBhdGguc2xpY2UobGFzdFNsYXNoICsgMSwgaSk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0bGFzdFNlZ21lbnRMZW5ndGggPSBpIC0gbGFzdFNsYXNoIC0gMTtcblx0XHRcdFx0fVxuXHRcdFx0XHRsYXN0U2xhc2ggPSBpO1xuXHRcdFx0XHRkb3RzID0gMDtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGNvZGUgPT09IENoYXIuZG90ICYmIGRvdHMgIT09IC0xKVxuXHRcdFx0e1xuXHRcdFx0XHQrK2RvdHM7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGRvdHMgPSAtMTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlcztcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBmdW5jdGlvbiByZWxhdGl2ZShmcm9tOiBzdHJpbmcgfCBGaWxhLCB0bzogc3RyaW5nIHwgRmlsYSlcblx0e1xuXHRcdGlmIChmcm9tID09PSB0bylcblx0XHRcdHJldHVybiBcIlwiO1xuXHRcdFxuXHRcdGZyb20gPSBwb3NpeC5yZXNvbHZlKGZyb20gaW5zdGFuY2VvZiBGaWxhID8gZnJvbS5wYXRoIDogZnJvbSk7XG5cdFx0dG8gPSBwb3NpeC5yZXNvbHZlKHRvIGluc3RhbmNlb2YgRmlsYSA/IHRvLnBhdGggOiB0byk7XG5cdFx0XG5cdFx0aWYgKGZyb20gPT09IHRvKVxuXHRcdFx0cmV0dXJuIFwiXCI7XG5cdFx0XG5cdFx0Ly8gVHJpbSBhbnkgbGVhZGluZyBiYWNrc2xhc2hlc1xuXHRcdHZhciBmcm9tU3RhcnQgPSAxO1xuXHRcdGZvciAoOyBmcm9tU3RhcnQgPCBmcm9tLmxlbmd0aDsgKytmcm9tU3RhcnQpIFxuXHRcdFx0aWYgKGZyb20uY2hhckNvZGVBdChmcm9tU3RhcnQpICE9PSA0NyAvKi8qLylcblx0XHRcdFx0YnJlYWs7XG5cdFx0XG5cdFx0dmFyIGZyb21FbmQgPSBmcm9tLmxlbmd0aDtcblx0XHR2YXIgZnJvbUxlbiA9IGZyb21FbmQgLSBmcm9tU3RhcnQ7XG5cdFx0XG5cdFx0Ly8gVHJpbSBhbnkgbGVhZGluZyBiYWNrc2xhc2hlc1xuXHRcdHZhciB0b1N0YXJ0ID0gMTtcblx0XHRmb3IgKDsgdG9TdGFydCA8IHRvLmxlbmd0aDsgKyt0b1N0YXJ0KVxuXHRcdFx0aWYgKHRvLmNoYXJDb2RlQXQodG9TdGFydCkgIT09IDQ3IC8qLyovKVxuXHRcdFx0XHRicmVhaztcblx0XHRcblx0XHR2YXIgdG9FbmQgPSB0by5sZW5ndGg7XG5cdFx0dmFyIHRvTGVuID0gdG9FbmQgLSB0b1N0YXJ0O1xuXHRcdFxuXHRcdC8vIENvbXBhcmUgcGF0aHMgdG8gZmluZCB0aGUgbG9uZ2VzdCBjb21tb24gcGF0aCBmcm9tIHJvb3Rcblx0XHR2YXIgbGVuZ3RoID0gZnJvbUxlbiA8IHRvTGVuID8gZnJvbUxlbiA6IHRvTGVuO1xuXHRcdHZhciBsYXN0Q29tbW9uU2VwID0gLTE7XG5cdFx0dmFyIGkgPSAwO1xuXHRcdGZvciAoOyBpIDw9IGxlbmd0aDsgKytpKVxuXHRcdHtcblx0XHRcdGlmIChpID09PSBsZW5ndGgpXG5cdFx0XHR7XG5cdFx0XHRcdGlmICh0b0xlbiA+IGxlbmd0aClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQgKyBpKSA9PT0gNDcgLyovKi8gKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdC8vIFdlIGdldCBoZXJlIGlmIGBmcm9tYCBpcyB0aGUgZXhhY3QgYmFzZSBwYXRoIGZvciBgdG9gLlxuXHRcdFx0XHRcdFx0Ly8gRm9yIGV4YW1wbGU6IGZyb209XCIvZm9vL2JhclwiOyB0bz1cIi9mb28vYmFyL2JhelwiXG5cdFx0XHRcdFx0XHRyZXR1cm4gdG8uc2xpY2UodG9TdGFydCArIGkgKyAxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoaSA9PT0gMClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBXZSBnZXQgaGVyZSBpZiBgZnJvbWAgaXMgdGhlIHJvb3Rcblx0XHRcdFx0XHRcdC8vIEZvciBleGFtcGxlOiBmcm9tPVwiL1wiOyB0bz1cIi9mb29cIlxuXHRcdFx0XHRcdFx0cmV0dXJuIHRvLnNsaWNlKHRvU3RhcnQgKyBpKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZWxzZSBpZiAoZnJvbUxlbiA+IGxlbmd0aClcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0ICsgaSkgPT09IDQ3IC8qLyovIClcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBXZSBnZXQgaGVyZSBpZiBgdG9gIGlzIHRoZSBleGFjdCBiYXNlIHBhdGggZm9yIGBmcm9tYC5cblx0XHRcdFx0XHRcdC8vIEZvciBleGFtcGxlOiBmcm9tPVwiL2Zvby9iYXIvYmF6XCI7IHRvPVwiL2Zvby9iYXJcIlxuXHRcdFx0XHRcdFx0bGFzdENvbW1vblNlcCA9IGk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKGkgPT09IDApXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0Ly8gV2UgZ2V0IGhlcmUgaWYgYHRvYCBpcyB0aGUgcm9vdC5cblx0XHRcdFx0XHRcdC8vIEZvciBleGFtcGxlOiBmcm9tPVwiL2Zvb1wiOyB0bz1cIi9cIlxuXHRcdFx0XHRcdFx0bGFzdENvbW1vblNlcCA9IDA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHR2YXIgZnJvbUNvZGUgPSBmcm9tLmNoYXJDb2RlQXQoZnJvbVN0YXJ0ICsgaSk7XG5cdFx0XHR2YXIgdG9Db2RlID0gdG8uY2hhckNvZGVBdCh0b1N0YXJ0ICsgaSk7XG5cdFx0XHRcblx0XHRcdGlmIChmcm9tQ29kZSAhPT0gdG9Db2RlKVxuXHRcdFx0XHRicmVhaztcblx0XHRcdFxuXHRcdFx0ZWxzZSBpZiAoZnJvbUNvZGUgPT09IDQ3IC8qLyovIClcblx0XHRcdFx0bGFzdENvbW1vblNlcCA9IGk7XG5cdFx0fVxuXHRcdFxuXHRcdHZhciBvdXQgPSBcIlwiO1xuXHRcdC8vIEdlbmVyYXRlIHRoZSByZWxhdGl2ZSBwYXRoIGJhc2VkIG9uIHRoZSBwYXRoIGRpZmZlcmVuY2UgYmV0d2VlbiBgdG9gXG5cdFx0Ly8gYW5kIGBmcm9tYFxuXHRcdGZvciAoaSA9IGZyb21TdGFydCArIGxhc3RDb21tb25TZXAgKyAxOyBpIDw9IGZyb21FbmQ7ICsraSlcblx0XHR7XG5cdFx0XHRpZiAoaSA9PT0gZnJvbUVuZCB8fCBmcm9tLmNoYXJDb2RlQXQoaSkgPT09IDQ3IC8qLyovIClcblx0XHRcdHtcblx0XHRcdFx0aWYgKG91dC5sZW5ndGggPT09IDApXG5cdFx0XHRcdFx0b3V0ICs9IFwiLi5cIjtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdG91dCArPSBcIi8uLlwiO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvLyBMYXN0bHksIGFwcGVuZCB0aGUgcmVzdCBvZiB0aGUgZGVzdGluYXRpb24gKGB0b2ApIHBhdGggdGhhdCBjb21lcyBhZnRlclxuXHRcdC8vIHRoZSBjb21tb24gcGF0aCBwYXJ0c1xuXHRcdGlmIChvdXQubGVuZ3RoID4gMClcblx0XHRcdHJldHVybiBvdXQgKyB0by5zbGljZSh0b1N0YXJ0ICsgbGFzdENvbW1vblNlcCk7XG5cdFx0XG5cdFx0dG9TdGFydCArPSBsYXN0Q29tbW9uU2VwO1xuXHRcdGlmICh0by5jaGFyQ29kZUF0KHRvU3RhcnQpID09PSA0NyAvKi8qLyApXG5cdFx0XHQrK3RvU3RhcnQ7XG5cdFx0XG5cdFx0cmV0dXJuIHRvLnNsaWNlKHRvU3RhcnQpO1xuXHR9XG5cdFxuXHRjb25zdCBwb3NpeCA9IHtcblx0XHRyZXNvbHZlKC4uLmFyZ3M6IHN0cmluZ1tdKVxuXHRcdHtcblx0XHRcdHZhciByZXNvbHZlZFBhdGggPSBcIlwiO1xuXHRcdFx0dmFyIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblx0XHRcdHZhciBjd2Q7XG5cdFx0XHRcblx0XHRcdGZvciAodmFyIGkgPSBhcmdzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSlcblx0XHRcdHtcblx0XHRcdFx0dmFyIHBhdGg7XG5cdFx0XHRcdGlmIChpID49IDApXG5cdFx0XHRcdFx0cGF0aCA9IGFyZ3NbaV07XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChjd2QgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgcHJvY2VzcyA9PT0gXCJvYmplY3RcIilcblx0XHRcdFx0XHRcdGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0cGF0aCA9IGN3ZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRcblx0XHRcdFx0Ly8gU2tpcCBlbXB0eSBlbnRyaWVzXG5cdFx0XHRcdGlmIChwYXRoLmxlbmd0aCA9PT0gMClcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XG5cdFx0XHRcdHJlc29sdmVkUGF0aCA9IHBhdGggKyBcIi9cIiArIHJlc29sdmVkUGF0aDtcblx0XHRcdFx0cmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckNvZGVBdCgwKSA9PT0gNDcgLyovKi87XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcblx0XHRcdC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXHRcdFx0XG5cdFx0XHQvLyBOb3JtYWxpemUgdGhlIHBhdGhcblx0XHRcdHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZVN0cmluZ1Bvc2l4KHJlc29sdmVkUGF0aCwgIXJlc29sdmVkQWJzb2x1dGUpO1xuXHRcdFx0XG5cdFx0XHRpZiAocmVzb2x2ZWRBYnNvbHV0ZSlcblx0XHRcdHtcblx0XHRcdFx0aWYgKHJlc29sdmVkUGF0aC5sZW5ndGggPiAwKVxuXHRcdFx0XHRcdHJldHVybiBcIi9cIiArIHJlc29sdmVkUGF0aDtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHJldHVybiBcIi9cIjtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHJlc29sdmVkUGF0aC5sZW5ndGggPiAwKVxuXHRcdFx0XHRyZXR1cm4gcmVzb2x2ZWRQYXRoO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gXCIuXCI7XG5cdFx0fSxcblx0fTtcblx0XG5cdGRlY2xhcmUgY29uc3QgcHJvY2VzczogYW55O1xuXHRcblx0LyoqICovXG5cdGNvbnN0IGVudW0gQ2hhclxuXHR7XG5cdFx0ZG90ID0gNDYsXG5cdFx0c2xhc2ggPSA0Nyxcblx0fVxuXHRcblx0LyoqICovXG5cdGV4cG9ydCBjb25zdCBlbnVtIEV2ZW50XG5cdHtcblx0XHRjcmVhdGUgPSBcImNyZWF0ZVwiLFxuXHRcdG1vZGlmeSA9IFwibW9kaWZ5XCIsXG5cdFx0ZGVsZXRlID0gXCJkZWxldGVcIixcblx0fVxufVxuXG4vL0B0cy1pZ25vcmUgQ29tbW9uSlMgY29tcGF0aWJpbGl0eVxudHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiBPYmplY3QuYXNzaWduKG1vZHVsZS5leHBvcnRzLCB7IEZpbGEgfSk7XG5cbi8vIENvbW1vbkpTIG1vZHVsZSB0eXBpbmdzXG5kZWNsYXJlIG1vZHVsZSBcIkBzcXVhcmVzYXBwL2ZpbGFcIlxue1xuXHRleHBvcnQgPSBGaWxhO1xufVxuIiwiXG4vKiogQGludGVybmFsICovXG5kZWNsYXJlIGNvbnN0IENBUEFDSVRPUjogYm9vbGVhbjtcblxuKCgpID0+XG57XG5cdGlmICh0eXBlb2YgQ0FQQUNJVE9SID09PSBcInVuZGVmaW5lZFwiKVxuXHRPYmplY3QuYXNzaWduKGdsb2JhbFRoaXMsIHsgQ0FQQUNJVE9SOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiAod2luZG93IGFzIGFueSkuQ2FwYWNpdG9yICE9PSBcInVuZGVmaW5lZFwiIH0pO1xuXHRcblx0Ly9AdHMtaWdub3JlXG5cdGlmICghQ0FQQUNJVE9SKSByZXR1cm47XG5cdFxuXHQvKiogKi9cblx0Y2xhc3MgRmlsYUNhcGFjaXRvciBleHRlbmRzIEZpbGEuRmlsYUJhY2tlbmRcblx0e1xuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgZ2V0IGZzKClcblx0XHR7XG5cdFx0XHRjb25zdCBnID0gZ2xvYmFsVGhpcyBhcyBhbnk7XG5cdFx0XHRjb25zdCBmcyA9IGcuQ2FwYWNpdG9yPy5QbHVnaW5zPy5GaWxlc3lzdGVtO1xuXHRcdFx0aWYgKCFmcylcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiRmlsZXN5c3RlbSBwbHVnaW4gbm90IGFkZGVkIHRvIENhcGFjaXRvci5cIik7XG5cdFx0XHRcblx0XHRcdHJldHVybiBmcyBhcyB0eXBlb2YgaW1wb3J0KFwiQGNhcGFjaXRvci9maWxlc3lzdGVtXCIpLkZpbGVzeXN0ZW07XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIEdldHMgdGhlIGZ1bGx5LXF1YWxpZmllZCBwYXRoLCBpbmNsdWRpbmcgYW55IGZpbGUgbmFtZSB0byB0aGVcblx0XHQgKiBmaWxlIHN5c3RlbSBvYmplY3QgYmVpbmcgcmVwcmVzZW50ZWQgYnkgdGhpcyBGaWxhIG9iamVjdC5cblx0XHQgKi9cblx0XHRnZXQgcGF0aCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIEZpbGEuam9pbiguLi50aGlzLmZpbGEuY29tcG9uZW50cyk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWRUZXh0KClcblx0XHR7XG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmZzLnJlYWRGaWxlKHtcblx0XHRcdFx0Li4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLFxuXHRcdFx0XHRlbmNvZGluZzogXCJ1dGY4XCIgYXMgYW55XG5cdFx0XHR9KTtcblx0XHRcdFxuXHRcdFx0cmV0dXJuIHJlc3VsdC5kYXRhIGFzIHN0cmluZztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZEJpbmFyeSgpXG5cdFx0e1xuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5mcy5yZWFkRmlsZSh7XG5cdFx0XHRcdC4uLnRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKSxcblx0XHRcdFx0ZW5jb2Rpbmc6IFwiYXNjaWlcIiBhcyBhbnlcblx0XHRcdH0pO1xuXHRcdFx0XG5cdFx0XHQvLyBEb2VzIHRoaXMgd29yayBvbiBpT1M/XG5cdFx0XHRjb25zdCBibG9iID0gcmVzdWx0LmRhdGEgYXMgQmxvYjtcblx0XHRcdGNvbnN0IGJ1ZmZlciA9IGF3YWl0IG5ldyBSZXNwb25zZShibG9iKS5hcnJheUJ1ZmZlcigpO1xuXHRcdFx0cmV0dXJuIG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG5cdFx0XHRcblx0XHRcdC8vY29uc3QgYmFzZTY0ID0gcmVzdWx0LmRhdGE7XG5cdFx0XHQvL3JldHVybiBVaW50OEFycmF5LmZyb20oYXRvYihiYXNlNjQpLCBjID0+IGMuY2hhckNvZGVBdCgwKSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWREaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZnMucmVhZGRpcih0aGlzLmdldERlZmF1bHRPcHRpb25zKCkpO1xuXHRcdFx0Y29uc3QgZmlsYXM6IEZpbGFbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGZpbGUgb2YgcmVzdWx0LmZpbGVzKVxuXHRcdFx0XHRpZiAoZmlsZS5uYW1lICE9PSBcIi5EU19TdG9yZVwiKVxuXHRcdFx0XHRcdGZpbGFzLnB1c2gobmV3IEZpbGEodGhpcy5wYXRoLCBmaWxlLm5hbWUgfHwgXCJcIikpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB1cCA9IHRoaXMuZmlsYS51cCgpO1xuXHRcdFx0XHRpZiAoIWF3YWl0IHVwLmV4aXN0cygpKVxuXHRcdFx0XHRcdGF3YWl0IHVwLndyaXRlRGlyZWN0b3J5KCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRjb25zdCB3cml0ZU9wdGlvbnMgPSB7XG5cdFx0XHRcdFx0Li4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLFxuXHRcdFx0XHRcdGRhdGE6IHRleHQsXG5cdFx0XHRcdFx0ZW5jb2Rpbmc6IFwidXRmOFwiIGFzIGFueVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKG9wdGlvbnM/LmFwcGVuZClcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmZzLmFwcGVuZEZpbGUod3JpdGVPcHRpb25zKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGF3YWl0IHRoaXMuZnMud3JpdGVGaWxlKHdyaXRlT3B0aW9ucyk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZSlcblx0XHRcdHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcIldyaXRlIGZhaWxlZCB0byBwYXRoOiBcIiArIHRoaXMucGF0aCk7XG5cdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZUJpbmFyeShhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpXG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5maWxhLnVwKCkud3JpdGVEaXJlY3RvcnkoKTtcblx0XHRcdGNvbnN0IGRhdGEgPSBhd2FpdCB0aGlzLmFycmF5QnVmZmVyVG9CYXNlNjQoYXJyYXlCdWZmZXIpO1xuXHRcdFx0YXdhaXQgdGhpcy5mcy53cml0ZUZpbGUoe1xuXHRcdFx0XHQuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksXG5cdFx0XHRcdGRhdGEsXG5cdFx0XHRcdGVuY29kaW5nOiBcImFzY2lpXCIgYXMgYW55XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBhcnJheUJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4ociA9PlxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBibG9iID0gbmV3IEJsb2IoW2J1ZmZlcl0sIHsgdHlwZTogXCJhcHBsaWNhdGlvbi9vY3RldC1iaW5hcnlcIiB9KTtcblx0XHRcdFx0Y29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblx0XHRcdFx0XG5cdFx0XHRcdHJlYWRlci5vbmxvYWQgPSBldiA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0Y29uc3QgZGF0YVVybCA9IChldi50YXJnZXQ/LnJlc3VsdCB8fCBcIlwiKSBhcyBzdHJpbmc7XG5cdFx0XHRcdFx0Y29uc3Qgc2xpY2UgPSBkYXRhVXJsLnNsaWNlKGRhdGFVcmwuaW5kZXhPZihgLGApICsgMSk7XG5cdFx0XHRcdFx0cihzbGljZSk7XG5cdFx0XHRcdH07XG5cdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGJsb2IpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLmZzLm1rZGlyKHtcblx0XHRcdFx0Li4udGhpcy5nZXREZWZhdWx0T3B0aW9ucygpLFxuXHRcdFx0XHRyZWN1cnNpdmU6IHRydWVcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBXcml0ZXMgYSBzeW1saW5rIGZpbGUgYXQgdGhlIGxvY2F0aW9uIHJlcHJlc2VudGVkIGJ5IHRoZSBzcGVjaWZpZWRcblx0XHQgKiBGaWxhIG9iamVjdCwgdG8gdGhlIGxvY2F0aW9uIHNwZWNpZmllZCBieSB0aGUgY3VycmVudCBGaWxhIG9iamVjdC5cblx0XHQgKi9cblx0XHRhc3luYyB3cml0ZVN5bWxpbmsoYXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKipcblx0XHQgKiBEZWxldGVzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSB0aGF0IHRoaXMgRmlsYSBvYmplY3QgcmVwcmVzZW50cy5cblx0XHQgKi9cblx0XHRhc3luYyBkZWxldGUoKTogUHJvbWlzZTxFcnJvciB8IHZvaWQ+XG5cdFx0e1xuXHRcdFx0aWYgKGF3YWl0IHRoaXMuaXNEaXJlY3RvcnkoKSlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPEVycm9yIHwgdm9pZD4oYXN5bmMgciA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5mcy5ybWRpcih7XG5cdFx0XHRcdFx0XHQuLi50aGlzLmdldERlZmF1bHRPcHRpb25zKCksXG5cdFx0XHRcdFx0XHRyZWN1cnNpdmU6IHRydWVcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRyKCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRhd2FpdCB0aGlzLmZzLmRlbGV0ZUZpbGUodGhpcy5nZXREZWZhdWx0T3B0aW9ucygpKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgbW92ZSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgY29weSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0Y29uc3QgZnJvbU9wdGlvbnMgPSB0aGlzLmdldERlZmF1bHRPcHRpb25zKCk7XG5cdFx0XHRjb25zdCB0b09wdGlvbnMgPSB0aGlzLmdldERlZmF1bHRPcHRpb25zKHRhcmdldC5wYXRoKTtcblx0XHRcdFxuXHRcdFx0YXdhaXQgdGhpcy5mcy5jb3B5KHtcblx0XHRcdFx0ZnJvbTogZnJvbU9wdGlvbnMucGF0aCxcblx0XHRcdFx0ZGlyZWN0b3J5OiBmcm9tT3B0aW9ucy5kaXJlY3RvcnksXG5cdFx0XHRcdHRvOiB0b09wdGlvbnMucGF0aCxcblx0XHRcdFx0dG9EaXJlY3Rvcnk6IHRvT3B0aW9ucy5kaXJlY3RvcnksXG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVuYW1lKG5ld05hbWU6IHN0cmluZylcblx0XHR7XG5cdFx0XHRjb25zdCB0YXJnZXQgPSB0aGlzLmZpbGEudXAoKS5kb3duKG5ld05hbWUpLnBhdGg7XG5cdFx0XHRjb25zdCBmcm9tT3B0aW9ucyA9IHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnMoKTtcblx0XHRcdGNvbnN0IHRvT3B0aW9ucyA9IHRoaXMuZ2V0RGVmYXVsdE9wdGlvbnModGFyZ2V0KTtcblx0XHRcdFxuXHRcdFx0YXdhaXQgdGhpcy5mcy5yZW5hbWUoe1xuXHRcdFx0XHRmcm9tOiB0aGlzLnBhdGgsXG5cdFx0XHRcdGRpcmVjdG9yeTogZnJvbU9wdGlvbnMuZGlyZWN0b3J5LFxuXHRcdFx0XHR0bzogdGFyZ2V0LFxuXHRcdFx0XHR0b0RpcmVjdG9yeTogdG9PcHRpb25zLmRpcmVjdG9yeVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHdhdGNoUHJvdGVjdGVkKFxuXHRcdFx0cmVjdXJzaXZlOiBib29sZWFuLFxuXHRcdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBGaWxhLkV2ZW50LCBmaWxhOiBGaWxhKSA9PiB2b2lkKTogKCkgPT4gdm9pZFxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZXhpc3RzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gISFhd2FpdCB0aGlzLmdldFN0YXQoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0U2l6ZSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldFN0YXQoKSk/LnNpemUgfHwgMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0TW9kaWZpZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldFN0YXQoKSk/Lm10aW1lIHx8IDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldENyZWF0ZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldFN0YXQoKSk/LmN0aW1lIHx8IDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldEFjY2Vzc2VkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBpc0RpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldFN0YXQoKSk/LnR5cGUgPT09IFwiZGlyZWN0b3J5XCI7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgYXN5bmMgZ2V0U3RhdCgpXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLmZzLnN0YXQodGhpcy5nZXREZWZhdWx0T3B0aW9ucygpKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlKSB7IHJldHVybiBudWxsOyB9XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgZ2V0RGVmYXVsdE9wdGlvbnModGFyZ2V0UGF0aDogc3RyaW5nID0gdGhpcy5wYXRoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHNsYXNoID0gdGFyZ2V0UGF0aC5pbmRleE9mKFwiL1wiKTtcblx0XHRcdGxldCBwYXRoID0gXCJcIjtcblx0XHRcdGxldCBkaXJlY3RvcnkgPSBcIlwiO1xuXHRcdFx0XG5cdFx0XHRpZiAoc2xhc2ggPCAwKVxuXHRcdFx0e1xuXHRcdFx0XHRwYXRoID0gdGFyZ2V0UGF0aDtcblx0XHRcdFx0ZGlyZWN0b3J5ID0gRGlyZWN0b3J5LmNhY2hlIGFzIGFueSBhcyBURGlyZWN0b3J5O1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRwYXRoID0gdGFyZ2V0UGF0aC5zbGljZShzbGFzaCArIDEpO1xuXHRcdFx0XHRkaXJlY3RvcnkgPSB0YXJnZXRQYXRoLnNsaWNlKDAsIHNsYXNoKSBhcyBURGlyZWN0b3J5O1xuXHRcdFx0fVxuXHRcdFx0XG5cdFx0XHRjb25zdCByZXN1bHQgPSB7XG5cdFx0XHRcdHBhdGgsXG5cdFx0XHRcdGRpcmVjdG9yeTogZGlyZWN0b3J5IGFzIFREaXJlY3Rvcnlcblx0XHRcdH07XG5cdFx0XHRcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXHR9XG5cdFxuXHRcblx0LyoqICovXG5cdGNvbnN0IGVudW0gRGlyZWN0b3J5XG5cdHtcblx0XHRjYWNoZSA9IFwiQ0FDSEVcIixcblx0XHRkYXRhID0gXCJEQVRBXCIsXG5cdFx0ZG9jdW1lbnRzID0gXCJET0NVTUVOVFNcIixcblx0XHRleHRlcm5hbCA9IFwiRVhURVJOQUxcIixcblx0XHRleHRlcm5hbFN0b3JhZ2UgPSBcIkVYVEVSTkFMX1NUT1JBR0VcIixcblx0XHRsaWJyYXJ5ID0gXCJMSUJSQVJZXCIsXG5cdH1cblx0XG5cdC8qKiAqL1xuXHR0eXBlIFREaXJlY3RvcnkgPSBpbXBvcnQoXCJAY2FwYWNpdG9yL2ZpbGVzeXN0ZW1cIikuRGlyZWN0b3J5O1xuXHRcblx0Y29uc3QgY3dkID0gXCJEQVRBXCI7XG5cdGNvbnN0IHRtcCA9IFwiQ0FDSEVcIjtcblx0Y29uc3Qgc2VwID0gXCIvXCI7XG5cdEZpbGEuc2V0dXAoRmlsYUNhcGFjaXRvciwgc2VwLCBjd2QsIHRtcCk7XG59KSgpOyIsIlxuLyoqIEBpbnRlcm5hbCAqL1xuZGVjbGFyZSBjb25zdCBOT0RFOiBib29sZWFuO1xuXG4oKCkgPT5cbntcblx0aWYgKHR5cGVvZiBOT0RFID09PSBcInVuZGVmaW5lZFwiKVxuXHRcdE9iamVjdC5hc3NpZ24oZ2xvYmFsVGhpcywgeyBOT0RFOiB0eXBlb2YgcHJvY2VzcyArIHR5cGVvZiByZXF1aXJlID09PSBcIm9iamVjdGZ1bmN0aW9uXCIgfSk7XG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKCFOT0RFKSByZXR1cm47XG5cdFxuXHRjbGFzcyBGaWxhTm9kZSBleHRlbmRzIEZpbGEuRmlsYUJhY2tlbmRcblx0e1xuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgcmVhZG9ubHkgZnMgPSByZXF1aXJlKFwiZnNcIikgYXMgdHlwZW9mIGltcG9ydChcImZzXCIpO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWRUZXh0KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5mcy5wcm9taXNlcy5yZWFkRmlsZSh0aGlzLmZpbGEucGF0aCwgXCJ1dGY4XCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkQmluYXJ5KCk6IFByb21pc2U8QXJyYXlCdWZmZXI+XG5cdFx0e1xuXHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuZnMucHJvbWlzZXMucmVhZEZpbGUodGhpcy5maWxhLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRjb25zdCBmaWxlTmFtZXMgPSBhd2FpdCB0aGlzLmZzLnByb21pc2VzLnJlYWRkaXIodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0Y29uc3QgZmlsYXM6IEZpbGFbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIGZpbGVOYW1lcylcblx0XHRcdFx0aWYgKGZpbGVOYW1lICE9PSBcIi5EU19TdG9yZVwiKVxuXHRcdFx0XHRcdGZpbGFzLnB1c2gobmV3IEZpbGEoLi4udGhpcy5maWxhLmNvbXBvbmVudHMsIGZpbGVOYW1lKSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBmaWxhcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVUZXh0KHRleHQ6IHN0cmluZywgb3B0aW9ucz86IEZpbGEuSVdyaXRlVGV4dE9wdGlvbnMpXG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5maWxhLnVwKCkud3JpdGVEaXJlY3RvcnkoKTtcblx0XHRcdFxuXHRcdFx0aWYgKG9wdGlvbnM/LmFwcGVuZClcblx0XHRcdFx0YXdhaXQgdGhpcy5mcy5wcm9taXNlcy5hcHBlbmRGaWxlKHRoaXMuZmlsYS5wYXRoLCB0ZXh0KTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0YXdhaXQgdGhpcy5mcy5wcm9taXNlcy53cml0ZUZpbGUodGhpcy5maWxhLnBhdGgsIHRleHQpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZUJpbmFyeShhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpXG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5maWxhLnVwKCkud3JpdGVEaXJlY3RvcnkoKTtcblx0XHRcdGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGFycmF5QnVmZmVyKTtcblx0XHRcdGF3YWl0IHRoaXMuZnMucHJvbWlzZXMud3JpdGVGaWxlKHRoaXMuZmlsYS5wYXRoLCBidWZmZXIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZURpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0aWYgKCF0aGlzLmZzLmV4aXN0c1N5bmModGhpcy5maWxhLnBhdGgpKVxuXHRcdFx0XHRhd2FpdCB0aGlzLmZzLnByb21pc2VzLm1rZGlyKHRoaXMuZmlsYS5wYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdFx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0YXN5bmMgd3JpdGVTeW1saW5rKGF0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyID0+XG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuZnMuc3ltbGluayhhdC5wYXRoLCB0aGlzLmZpbGEucGF0aCwgKCkgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHIoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdFx0ICovXG5cdFx0YXN5bmMgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPlxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxFcnJvciB8IHZvaWQ+KHJlc29sdmUgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuZnMucm1kaXIodGhpcy5maWxhLnBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0sIGVycm9yID0+XG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0cmVzb2x2ZShlcnJvciB8fCB2b2lkIDApO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0YXdhaXQgdGhpcy5mcy5wcm9taXNlcy51bmxpbmsodGhpcy5maWxhLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRtb3ZlKHRhcmdldDogRmlsYSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PlxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmZzLnJlbmFtZSh0aGlzLmZpbGEucGF0aCwgdGFyZ2V0LnBhdGgsICgpID0+IHJlc29sdmUoKSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0Y29weSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KGFzeW5jIHJlc29sdmUgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKGF3YWl0IHRoaXMuaXNEaXJlY3RvcnkoKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMuZnMuY3AodGhpcy5maWxhLnBhdGgsIHRhcmdldC5wYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSwgKCkgPT4gcmVzb2x2ZSgpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRjb25zdCBkaXIgPSB0YXJnZXQudXAoKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoIWF3YWl0IGRpci5leGlzdHMoKSlcblx0XHRcdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gdGhpcy5mcy5ta2RpcihkaXIucGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSwgcikpO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdHRoaXMuZnMuY29weUZpbGUodGhpcy5maWxhLnBhdGgsIHRhcmdldC5wYXRoLCAoKSA9PiByZXNvbHZlKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0d2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sXG5cdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEsIHNlY29uZGFyeUZpbGE/OiBGaWxhKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdGNvbnN0IHdhdGNoZXIgPSBGaWxhTm9kZS5jaG9raWRhci53YXRjaCh0aGlzLmZpbGEucGF0aCk7XG5cdFx0XHRcblx0XHRcdHdhdGNoZXIub24oXCJyZWFkeVwiLCAoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHR3YXRjaGVyLm9uKFwiYWxsXCIsIChldk5hbWUsIHBhdGgpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAocGF0aC5lbmRzV2l0aChcIi8uRFNfU3RvcmVcIikpXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0bGV0IGV2OiBGaWxhLkV2ZW50IHwgdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGlmIChldk5hbWUgPT09IFwiYWRkXCIpXG5cdFx0XHRcdFx0XHRldiA9IEZpbGEuRXZlbnQuY3JlYXRlO1xuXHRcdFx0XHRcdFxuXHRcdFx0XHRcdGVsc2UgaWYgKGV2TmFtZSA9PT0gXCJjaGFuZ2VcIilcblx0XHRcdFx0XHRcdGV2ID0gRmlsYS5FdmVudC5tb2RpZnk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZXZOYW1lID09PSBcInVubGlua1wiKVxuXHRcdFx0XHRcdFx0ZXYgPSBGaWxhLkV2ZW50LmRlbGV0ZTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRpZiAoZXYpXG5cdFx0XHRcdFx0XHRjYWxsYmFja0ZuKGV2LCBuZXcgRmlsYShwYXRoKSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiAoKSA9PiB7IHdhdGNoZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCkgfTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMgZ2V0IGNob2tpZGFyKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5fY2hva2lkYXIgfHwgKHRoaXMuX2Nob2tpZGFyID0gcmVxdWlyZShcImNob2tpZGFyXCIpKTtcblx0XHR9XG5cdFx0cHJpdmF0ZSBzdGF0aWMgX2Nob2tpZGFyOiB0eXBlb2YgaW1wb3J0KFwiY2hva2lkYXJcIik7XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVuYW1lKG5ld05hbWU6IHN0cmluZylcblx0XHR7XG5cdFx0XHRyZXR1cm4gdGhpcy5mcy5wcm9taXNlcy5yZW5hbWUodGhpcy5maWxhLnBhdGgsIHRoaXMuZmlsYS51cCgpLmRvd24obmV3TmFtZSkucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGV4aXN0cygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG5ldyBQcm9taXNlPGJvb2xlYW4+KHIgPT5cblx0XHRcdHtcblx0XHRcdFx0dGhpcy5mcy5zdGF0KHRoaXMuZmlsYS5wYXRoLCBlcnJvciA9PlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cighZXJyb3IpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRTaXplKClcblx0XHR7XG5cdFx0XHRjb25zdCBzdGF0cyA9IGF3YWl0IHRoaXMuZ2V0U3RhdHMoKTtcblx0XHRcdHJldHVybiBzdGF0cz8uc2l6ZSB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRNb2RpZmllZFRpY2tzKClcblx0XHR7XG5cdFx0XHRjb25zdCBzdGF0cyA9IGF3YWl0IHRoaXMuZ2V0U3RhdHMoKTtcblx0XHRcdHJldHVybiBzdGF0cz8ubXRpbWVNcyB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRDcmVhdGVkVGlja3MoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHN0YXRzID0gYXdhaXQgdGhpcy5nZXRTdGF0cygpO1xuXHRcdFx0cmV0dXJuIHN0YXRzPy5iaXJ0aHRpbWVNcyB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRBY2Nlc3NlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRjb25zdCBzdGF0cyA9IGF3YWl0IHRoaXMuZ2V0U3RhdHMoKTtcblx0XHRcdHJldHVybiBzdGF0cz8uYXRpbWVNcyB8fCAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBpc0RpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0Y29uc3Qgc3RhdHMgPSBhd2FpdCB0aGlzLmdldFN0YXRzKCk7XG5cdFx0XHRyZXR1cm4gc3RhdHM/LmlzRGlyZWN0b3J5KCkgfHwgZmFsc2U7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgYXN5bmMgZ2V0U3RhdHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiBuZXcgUHJvbWlzZTxpbXBvcnQoXCJmc1wiKS5TdGF0cyB8IHVuZGVmaW5lZD4ociA9PlxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmZzLnN0YXQodGhpcy5maWxhLnBhdGgsIChlcnJvciwgc3RhdHMpID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyKHN0YXRzKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblx0XG5cdGNvbnN0IHNlcCA9IChyZXF1aXJlKFwicGF0aFwiKSBhcyB0eXBlb2YgaW1wb3J0KFwicGF0aFwiKSkuc2VwO1xuXHRjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuXHRjb25zdCB0bXAgPSAocmVxdWlyZShcIm9zXCIpIGFzIHR5cGVvZiBpbXBvcnQoXCJvc1wiKSkudG1wZGlyKCk7XG5cdEZpbGEuc2V0dXAoRmlsYU5vZGUsIHNlcCwgY3dkLCB0bXApO1xufSkoKTtcbiIsIlxuLyoqIEBpbnRlcm5hbCAqL1xuZGVjbGFyZSBjb25zdCBUQVVSSTogYm9vbGVhbjtcblxuKCgpID0+XG57XG5cdGlmICh0eXBlb2YgVEFVUkkgPT09IFwidW5kZWZpbmVkXCIpXG5cdFx0T2JqZWN0LmFzc2lnbihnbG9iYWxUaGlzLCB7IFRBVVJJOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiAoZ2xvYmFsVGhpcyBhcyBhbnkpLl9fVEFVUklfXyAhPT0gXCJ1bmRlZmluZWRcIiB9KTtcblx0XG5cdC8vQHRzLWlnbm9yZVxuXHRpZiAoIVRBVVJJKSByZXR1cm47XG5cdFxuXHRjbGFzcyBGaWxhVGF1cmkgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogKi9cblx0XHRwcml2YXRlIHJlYWRvbmx5IGZzOiB0eXBlb2YgaW1wb3J0KFwiQHRhdXJpLWFwcHMvYXBpXCIpLmZzID0gXG5cdFx0XHQoZ2xvYmFsVGhpcyBhcyBhbnkpLl9fVEFVUklfXy5mcztcblx0XHRcblx0XHQvKiogKi9cblx0XHRyZWFkVGV4dCgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuZnMucmVhZFRleHRGaWxlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0cmVhZEJpbmFyeSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuZnMucmVhZEJpbmFyeUZpbGUodGhpcy5maWxhLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZWFkRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRjb25zdCBmaWxlTmFtZXMgPSBhd2FpdCB0aGlzLmZzLnJlYWREaXIodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0Y29uc3QgZmlsYXM6IEZpbGFbXSA9IFtdO1xuXHRcdFx0XG5cdFx0XHRmb3IgKGNvbnN0IGZpbGVOYW1lIG9mIGZpbGVOYW1lcylcblx0XHRcdFx0aWYgKGZpbGVOYW1lLm5hbWUgIT09IFwiLkRTX1N0b3JlXCIpXG5cdFx0XHRcdFx0ZmlsYXMucHVzaChuZXcgRmlsYSh0aGlzLmZpbGEucGF0aCwgZmlsZU5hbWUubmFtZSB8fCBcIlwiKSk7XG5cdFx0XHRcblx0XHRcdHJldHVybiBmaWxhcztcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVUZXh0KHRleHQ6IHN0cmluZywgb3B0aW9ucz86IEZpbGEuSVdyaXRlVGV4dE9wdGlvbnMpXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHVwID0gdGhpcy5maWxhLnVwKCk7XG5cdFx0XHRcdGlmICghYXdhaXQgdXAuZXhpc3RzKCkpXG5cdFx0XHRcdFx0YXdhaXQgdXAud3JpdGVEaXJlY3RvcnkoKTtcblx0XHRcdFx0XG5cdFx0XHRcdGF3YWl0IHRoaXMuZnMud3JpdGVUZXh0RmlsZSh0aGlzLmZpbGEucGF0aCwgdGV4dCwge1xuXHRcdFx0XHRcdGFwcGVuZDogb3B0aW9ucz8uYXBwZW5kXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGUpXG5cdFx0XHR7XG5cdFx0XHRcdGRlYnVnZ2VyO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyB3cml0ZUJpbmFyeShhcnJheUJ1ZmZlcjogQXJyYXlCdWZmZXIpXG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5maWxhLnVwKCkud3JpdGVEaXJlY3RvcnkoKTtcblx0XHRcdGF3YWl0IHRoaXMuZnMud3JpdGVCaW5hcnlGaWxlKHRoaXMuZmlsYS5wYXRoLCBhcnJheUJ1ZmZlcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHR0aGlzLmZzLmNyZWF0ZURpcih0aGlzLmZpbGEucGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFdyaXRlcyBhIHN5bWxpbmsgZmlsZSBhdCB0aGUgbG9jYXRpb24gcmVwcmVzZW50ZWQgYnkgdGhlIHNwZWNpZmllZFxuXHRcdCAqIEZpbGEgb2JqZWN0LCB0byB0aGUgbG9jYXRpb24gc3BlY2lmaWVkIGJ5IHRoZSBjdXJyZW50IEZpbGEgb2JqZWN0LlxuXHRcdCAqL1xuXHRcdGFzeW5jIHdyaXRlU3ltbGluayhhdDogRmlsYSlcblx0XHR7XG5cdFx0XHRyZXR1cm4gbnVsbCBhcyBhbnk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIERlbGV0ZXMgdGhlIGZpbGUgb3IgZGlyZWN0b3J5IHRoYXQgdGhpcyBGaWxhIG9iamVjdCByZXByZXNlbnRzLlxuXHRcdCAqL1xuXHRcdGFzeW5jIGRlbGV0ZSgpOiBQcm9taXNlPEVycm9yIHwgdm9pZD5cblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gbmV3IFByb21pc2U8RXJyb3IgfCB2b2lkPihhc3luYyByZXNvbHZlID0+XG5cdFx0XHRcdHtcblx0XHRcdFx0XHRhd2FpdCB0aGlzLmZzLnJlbW92ZURpcih0aGlzLmZpbGEucGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0YXdhaXQgdGhpcy5mcy5yZW1vdmVGaWxlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0bW92ZSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIG51bGwgYXMgYW55O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBjb3B5KHRhcmdldDogRmlsYSlcblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGFyZ2V0LmlzRGlyZWN0b3J5KCkpXG5cdFx0XHRcdHRocm93IFwiQ29weWluZyBkaXJlY3RvcmllcyBpcyBub3QgaW1wbGVtZW50ZWQuXCI7XG5cdFx0XHRcblx0XHRcdGF3YWl0IHRoaXMuZnMuY29weUZpbGUodGhpcy5maWxhLnBhdGgsIHRhcmdldC5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0d2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sXG5cdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEpID0+IHZvaWQpXG5cdFx0e1xuXHRcdFx0bGV0IHVuOiBGdW5jdGlvbiB8IG51bGwgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHQoYXN5bmMgKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0dW4gPSBhd2FpdCB3YXRjaEludGVybmFsKHRoaXMuZmlsYS5wYXRoLCB7fSwgYXN5bmMgZXYgPT5cblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmICghdW4pXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgcGF5bG9hZCA9IGV2LnBheWxvYWQucGF5bG9hZDtcblx0XHRcdFx0XHRpZiAodHlwZW9mIHBheWxvYWQgIT09IFwic3RyaW5nXCIpXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0Y29uc3QgZmlsYSA9IG5ldyBGaWxhKGV2LnBheWxvYWQucGF5bG9hZCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKGV2LnR5cGUgPT09IFwiTm90aWNlV3JpdGVcIiB8fCBldi50eXBlID09PSBcIldyaXRlXCIpXG5cdFx0XHRcdFx0XHRjYWxsYmFja0ZuKEZpbGEuRXZlbnQubW9kaWZ5LCBmaWxhKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChldi50eXBlID09PSBcIk5vdGljZVJlbW92ZVwiIHx8IGV2LnR5cGUgPT09IFwiUmVtb3ZlXCIpXG5cdFx0XHRcdFx0XHRjYWxsYmFja0ZuKEZpbGEuRXZlbnQuZGVsZXRlLCBmaWxhKTtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHRlbHNlIGlmIChldi50eXBlID09PSBcIkNyZWF0ZVwiIHx8IGV2LnR5cGUgPT09IFwiUmVuYW1lXCIpXG5cdFx0XHRcdFx0XHRjYWxsYmFja0ZuKEZpbGEuRXZlbnQubW9kaWZ5LCBmaWxhKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KSgpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gKCkgPT5cblx0XHRcdHtcblx0XHRcdFx0Ly8gVGhpcyBpcyBoYWNreS4uLiB0aGUgaW50ZXJmYWNlIGV4cGVjdHMgYSBmdW5jdGlvbiB0byBiZVxuXHRcdFx0XHQvLyByZXR1cm5lZCByYXRoZXIgdGhhbiBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBvbmUsXG5cdFx0XHRcdC8vIHNvIHRoaXMgd2FpdHMgMTAwbXMgdG8gY2FsbCB0aGUgdW4oKSBmdW5jdGlvbiBpZiB0aGlzIHVud2F0Y2hcblx0XHRcdFx0Ly8gZnVuY3Rpb24gaXMgaW52b2tlZCBpbW1lZGlhdGVseSBhZnRlciBjYWxsaW5nIHdhdGNoKCkuXG5cdFx0XHRcdGlmICh1bilcblx0XHRcdFx0XHR1bigpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB1bj8uKCksIDEwMCk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyByZW5hbWUobmV3TmFtZTogc3RyaW5nKVxuXHRcdHtcblx0XHRcdC8vIE5vdGUgdGhhdCB0aGUgXCJyZW5hbWVGaWxlXCIgbWV0aG9kIGFjdHVhbGx5IHdvcmtzIG9uIGRpcmVjdG9yaWVzXG5cdFx0XHRyZXR1cm4gdGhpcy5mcy5yZW5hbWVGaWxlKHRoaXMuZmlsYS5wYXRoLCB0aGlzLmZpbGEudXAoKS5kb3duKG5ld05hbWUpLnBhdGgpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdHJldHVybiB0aGlzLmZzLmV4aXN0cyh0aGlzLmZpbGEucGF0aCk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRNZXRhKCkpLnNpemU7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldE1vZGlmaWVkVGlja3MoKVxuXHRcdHtcblx0XHRcdHJldHVybiAoYXdhaXQgdGhpcy5nZXRNZXRhKCkpLm1vZGlmaWVkQXQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldENyZWF0ZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldE1ldGEoKSkuY3JlYXRlZEF0O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRBY2Nlc3NlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gKGF3YWl0IHRoaXMuZ2V0TWV0YSgpKS5hY2Nlc3NlZEF0O1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBpc0RpcmVjdG9yeSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIChhd2FpdCB0aGlzLmdldE1ldGEoKSkuaXNEaXI7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHByaXZhdGUgYXN5bmMgZ2V0TWV0YSgpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIHRoaXMuX21ldGEgfHwgKHRoaXMuX21ldGEgPSBhd2FpdCBnZXRNZXRhZGF0YSh0aGlzLmZpbGEucGF0aCkpO1xuXHRcdH1cblx0XHRwcml2YXRlIF9tZXRhOiBNZXRhZGF0YSB8IG51bGwgPSBudWxsO1xuXHR9XG5cdFxuXHRjb25zdCB0ID0gKGdsb2JhbFRoaXMgYXMgYW55KS5fX1RBVVJJX187XG5cdGNvbnN0IHRhdXJpOiB0eXBlb2YgaW1wb3J0KFwiQHRhdXJpLWFwcHMvYXBpXCIpLnRhdXJpID0gdC50YXVyaTtcblx0Y29uc3Qgd2luZDogdHlwZW9mIGltcG9ydChcIkB0YXVyaS1hcHBzL2FwaVwiKS53aW5kb3cgPSB0LndpbmRvdztcblxuXHQvKiogQGludGVybmFsICovXG5cdGFzeW5jIGZ1bmN0aW9uIHVud2F0Y2goaWQ6IGFueSlcblx0e1xuXHRcdGF3YWl0IHRhdXJpLmludm9rZSgncGx1Z2luOmZzLXdhdGNofHVud2F0Y2gnLCB7IGlkIH0pO1xuXHR9XG5cblx0LyoqIEBpbnRlcm5hbCAqL1xuXHRhc3luYyBmdW5jdGlvbiB3YXRjaEludGVybmFsKFxuXHRcdHBhdGhzOiBzdHJpbmcgfCBzdHJpbmdbXSxcblx0XHRvcHRpb25zOiBEZWJvdW5jZWRXYXRjaE9wdGlvbnMsXG5cdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBUYXVyaVdhdGNoRXZlbnQpID0+IHZvaWQpOiBQcm9taXNlPCgpID0+IFByb21pc2U8dm9pZD4+XG5cdHtcblx0XHRjb25zdCBvcHRzID0ge1xuXHRcdFx0cmVjdXJzaXZlOiBmYWxzZSxcblx0XHRcdGRlbGF5TXM6IDIwMDAsXG5cdFx0XHQuLi5vcHRpb25zLFxuXHRcdH07XG5cdFx0XG5cdFx0bGV0IHdhdGNoUGF0aHM7XG5cdFx0aWYgKHR5cGVvZiBwYXRocyA9PT0gXCJzdHJpbmdcIilcblx0XHRcdHdhdGNoUGF0aHMgPSBbcGF0aHNdO1xuXHRcdGVsc2Vcblx0XHRcdHdhdGNoUGF0aHMgPSBwYXRocztcblx0XHRcblx0XHRjb25zdCBpZCA9IHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKG5ldyBVaW50MzJBcnJheSgxKSlbMF07XG5cdFx0YXdhaXQgdGF1cmkuaW52b2tlKFwicGx1Z2luOmZzLXdhdGNofHdhdGNoXCIsIHtcblx0XHRcdGlkLFxuXHRcdFx0cGF0aHM6IHdhdGNoUGF0aHMsXG5cdFx0XHRvcHRpb25zOiBvcHRzLFxuXHRcdH0pO1xuXHRcdFxuXHRcdGNvbnN0IHVubGlzdGVuID0gYXdhaXQgd2luZC5hcHBXaW5kb3cubGlzdGVuKFxuXHRcdFx0YHdhdGNoZXI6Ly9yYXctZXZlbnQvJHtpZH1gLFxuXHRcdFx0ZXZlbnQgPT5cblx0XHR7XG5cdFx0XHRjYWxsYmFja0ZuKGV2ZW50IGFzIFRhdXJpV2F0Y2hFdmVudCk7XG5cdFx0fSk7XG5cdFx0XG5cdFx0cmV0dXJuIGFzeW5jICgpID0+XG5cdFx0e1xuXHRcdFx0YXdhaXQgdW53YXRjaChpZCk7XG5cdFx0XHR1bmxpc3RlbigpO1xuXHRcdH07XG5cdH1cblxuXHQvKiogQGludGVybmFsICovXG5cdGFzeW5jIGZ1bmN0aW9uIHdhdGNoSW1tZWRpYXRlKFxuXHRcdHBhdGhzOiBzdHJpbmcgfCBzdHJpbmdbXSxcblx0XHRvcHRpb25zOiBEZWJvdW5jZWRXYXRjaE9wdGlvbnMsXG5cdFx0Y2FsbGJhY2tGbjogKGV2ZW50OiBUYXVyaVdhdGNoRXZlbnQpID0+IHZvaWQpOiBQcm9taXNlPCgpID0+IFByb21pc2U8dm9pZD4+XG5cdHtcblx0XHRjb25zdCBvcHRzID0ge1xuXHRcdFx0cmVjdXJzaXZlOiBmYWxzZSxcblx0XHRcdC4uLm9wdGlvbnMsXG5cdFx0XHRkZWxheU1zOiBudWxsXG5cdFx0fTtcblx0XHRcblx0XHRjb25zdCB3YXRjaFBhdGhzID0gdHlwZW9mIHBhdGhzID09PSBcInN0cmluZ1wiID8gW3BhdGhzXSA6IHBhdGhzO1xuXHRcdGNvbnN0IGlkID0gd2luZG93LmNyeXB0by5nZXRSYW5kb21WYWx1ZXMobmV3IFVpbnQzMkFycmF5KDEpKVswXTtcblx0XHRcblx0XHRhd2FpdCB0YXVyaS5pbnZva2UoXCJwbHVnaW46ZnMtd2F0Y2h8d2F0Y2hcIiwge1xuXHRcdFx0aWQsXG5cdFx0XHRwYXRoczogd2F0Y2hQYXRocyxcblx0XHRcdG9wdGlvbnM6IG9wdHMsXG5cdFx0fSk7XG5cdFx0XG5cdFx0Y29uc3QgdW5saXN0ZW4gPSBhd2FpdCB3aW5kLmFwcFdpbmRvdy5saXN0ZW4oXG5cdFx0XHRgd2F0Y2hlcjovL3Jhdy1ldmVudC8ke2lkfWAsXG5cdFx0XHRldmVudCA9PlxuXHRcdHtcblx0XHRcdGNhbGxiYWNrRm4oZXZlbnQgYXMgVGF1cmlXYXRjaEV2ZW50KTtcblx0XHR9KTtcblx0XHRcblx0XHRyZXR1cm4gYXN5bmMgKCkgPT5cblx0XHR7XG5cdFx0XHRhd2FpdCB1bndhdGNoKGlkKTtcblx0XHRcdHVubGlzdGVuKCk7XG5cdFx0fTtcblx0fVxuXG5cdC8qKiAqL1xuXHRpbnRlcmZhY2UgVGF1cmlXYXRjaEV2ZW50XG5cdHtcblx0XHQvKiogRXhhbXBsZTogXCJ3YXRjaGVyOi8vZGVib3VuY2VkLWV2ZW50LzI5MDMwMzJcIiAqL1xuXHRcdHJlYWRvbmx5IGV2ZW50OiBzdHJpbmc7XG5cdFx0LyoqIEV4YW1wbGU6IFwibWFpblwiICovXG5cdFx0cmVhZG9ubHkgd2luZG93TGFiZWw6IHN0cmluZztcblx0XHQvKiogRXhhbXBsZTogL1VzZXJzL3VzZXIvTGlicmFyeS9BcHBsaWNhdGlvbiBTdXBwb3J0L2NvbS5hcHAvZmlsZW5hbWUudHh0ICovXG5cdFx0cmVhZG9ubHkgcGF5bG9hZDogeyBwYXlsb2FkOiBzdHJpbmc7IH07XG5cdFx0LyoqICovXG5cdFx0cmVhZG9ubHkgdHlwZTogXG5cdFx0XHRcIk5vdGljZVdyaXRlXCIgfFxuXHRcdFx0XCJOb3RpY2VSZW1vdmVcIiB8XG5cdFx0XHRcIkNyZWF0ZVwiIHxcblx0XHRcdFwiV3JpdGVcIiB8XG5cdFx0XHRcIkNobW9kXCIgfFxuXHRcdFx0XCJSZW1vdmVcIiB8XG5cdFx0XHRcIlJlbmFtZVwiIHxcblx0XHRcdFwiUmVzY2FuXCIgfFxuXHRcdFx0XCJFcnJvclwiO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdHJlYWRvbmx5IGlkOiBudW1iZXI7XG5cdH1cblxuXHQvKiogQGludGVybmFsICovXG5cdGludGVyZmFjZSBXYXRjaE9wdGlvbnNcblx0e1xuXHRcdHJlY3Vyc2l2ZT86IGJvb2xlYW47XG5cdH1cblxuXHQvKiogQGludGVybmFsICovXG5cdGludGVyZmFjZSBEZWJvdW5jZWRXYXRjaE9wdGlvbnMgZXh0ZW5kcyBXYXRjaE9wdGlvbnNcblx0e1xuXHRcdGRlbGF5TXM/OiBudW1iZXI7XG5cdH1cblxuXHQvKiogQGludGVybmFsICovXG5cdGZ1bmN0aW9uIGdldE1ldGFkYXRhKHBhdGg6IHN0cmluZyk6IFByb21pc2U8TWV0YWRhdGE+XG5cdHtcblx0XHRyZXR1cm4gdGF1cmkuaW52b2tlKFwicGx1Z2luOmZzLWV4dHJhfG1ldGFkYXRhXCIsIHsgcGF0aCB9KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBNZXRhZGF0YSBpbmZvcm1hdGlvbiBhYm91dCBhIGZpbGUuXG5cdCAqIFRoaXMgc3RydWN0dXJlIGlzIHJldHVybmVkIGZyb20gdGhlIGBtZXRhZGF0YWAgZnVuY3Rpb24gb3IgbWV0aG9kXG5cdCAqIGFuZCByZXByZXNlbnRzIGtub3duIG1ldGFkYXRhIGFib3V0IGEgZmlsZSBzdWNoIGFzIGl0cyBwZXJtaXNzaW9ucyxcblx0ICogc2l6ZSwgbW9kaWZpY2F0aW9uIHRpbWVzLCBldGMuXG5cdCAqL1xuXHRpbnRlcmZhY2UgTWV0YWRhdGFcblx0e1xuXHRcdC8qKlxuXHRcdCAqIFRoZSBsYXN0IGFjY2VzcyB0aW1lIG9mIHRoaXMgbWV0YWRhdGEuXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgYWNjZXNzZWRBdDogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBjcmVhdGlvbiB0aW1lIGxpc3RlZCBpbiB0aGlzIG1ldGFkYXRhLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGNyZWF0ZWRBdDogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBsYXN0IG1vZGlmaWNhdGlvbiB0aW1lIGxpc3RlZCBpbiB0aGlzIG1ldGFkYXRhLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IG1vZGlmaWVkQXQ6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBgdHJ1ZWAgaWYgdGhpcyBtZXRhZGF0YSBpcyBmb3IgYSBkaXJlY3RvcnkuXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgaXNEaXI6IGJvb2xlYW47XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogYHRydWVgIGlmIHRoaXMgbWV0YWRhdGEgaXMgZm9yIGEgcmVndWxhciBmaWxlLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGlzRmlsZTogYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBgdHJ1ZWAgaWYgdGhpcyBtZXRhZGF0YSBpcyBmb3IgYSBzeW1ib2xpYyBsaW5rLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGlzU3ltbGluazogYm9vbGVhbjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgc2l6ZSBvZiB0aGUgZmlsZSwgaW4gYnl0ZXMsIHRoaXMgbWV0YWRhdGEgaXMgZm9yLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IHNpemU6IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgcGVybWlzc2lvbnMgb2YgdGhlIGZpbGUgdGhpcyBtZXRhZGF0YSBpcyBmb3IuXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgcGVybWlzc2lvbnM6IFBlcm1pc3Npb25zO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBJRCBvZiB0aGUgZGV2aWNlIGNvbnRhaW5pbmcgdGhlIGZpbGUuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgZGV2PzogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBpbm9kZSBudW1iZXIuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgaW5vPzogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSByaWdodHMgYXBwbGllZCB0byB0aGlzIGZpbGUuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgbW9kZT86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgbnVtYmVyIG9mIGhhcmQgbGlua3MgcG9pbnRpbmcgdG8gdGhpcyBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IG5saW5rPzogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSB1c2VyIElEIG9mIHRoZSBvd25lciBvZiB0aGlzIGZpbGUuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgdWlkPzogbnVtYmVyO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSBncm91cCBJRCBvZiB0aGUgb3duZXIgb2YgdGhpcyBmaWxlLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGdpZD86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgZGV2aWNlIElEIG9mIHRoaXMgZmlsZSAoaWYgaXQgaXMgYSBzcGVjaWFsIG9uZSkuIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgcmRldj86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgYmxvY2sgc2l6ZSBmb3IgZmlsZXN5c3RlbSBJL08uIE9ubHkgYXZhaWxhYmxlIG9uIFVuaXguXG5cdFx0ICovXG5cdFx0cmVhZG9ubHkgYmxrc2l6ZT86IG51bWJlcjtcblx0XHRcblx0XHQvKipcblx0XHQgKiBUaGUgbnVtYmVyIG9mIGJsb2NrcyBhbGxvY2F0ZWQgdG8gdGhlIGZpbGUsIGluIDUxMi1ieXRlIHVuaXRzLiBPbmx5IGF2YWlsYWJsZSBvbiBVbml4LlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5IGJsb2Nrcz86IG51bWJlcjtcblx0fVxuXG5cdC8qKiAqL1xuXHRpbnRlcmZhY2UgUGVybWlzc2lvbnNcblx0e1xuXHRcdC8qKlxuXHRcdCAqIGB0cnVlYCBpZiB0aGVzZSBwZXJtaXNzaW9ucyBkZXNjcmliZSBhIHJlYWRvbmx5ICh1bndyaXRhYmxlKSBmaWxlLlxuXHRcdCAqL1xuXHRcdHJlYWRvbmx5OiBib29sZWFuO1xuXHRcdFxuXHRcdC8qKlxuXHRcdCAqIFRoZSB1bmRlcmx5aW5nIHJhdyBgc3RfbW9kZWAgYml0cyB0aGF0IGNvbnRhaW4gdGhlIHN0YW5kYXJkIFVuaXhcblx0XHQgKiBwZXJtaXNzaW9ucyBmb3IgdGhpcyBmaWxlLlxuXHRcdCAqL1xuXHRcdG1vZGU/OiBudW1iZXI7XG5cdH1cblx0XHRcblx0e1xuXHRcdGxldCBwYXRoOiB0eXBlb2YgaW1wb3J0KFwiQHRhdXJpLWFwcHMvYXBpXCIpLnBhdGggfCBudWxsID0gbnVsbDtcblx0XHR0cnlcblx0XHR7XG5cdFx0XHRwYXRoID0gKGdsb2JhbFRoaXMgYXMgYW55KS5fX1RBVVJJX18ucGF0aCBhcyB0eXBlb2YgaW1wb3J0KFwiQHRhdXJpLWFwcHMvYXBpXCIpLnBhdGg7XG5cdFx0fVxuXHRcdGNhdGNoIChlKVxuXHRcdHtcblx0XHRcdGNvbnNvbGUubG9nKFwid2l0aEdsb2JhbFRhdXJpIGlzIG5vdCBzZXRcIik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdFxuXHRcdGNvbnN0IHNlcCA9IHBhdGg/LnNlcCB8fCBcIi9cIjtcblx0XHRjb25zdCBjd2QgPSBcIi9cIjtcblx0XHRjb25zdCB0bXAgPSBcIi9cIjtcblx0XHRGaWxhLnNldHVwKEZpbGFUYXVyaSwgc2VwLCBjd2QsIHRtcCk7XG5cdFx0XG5cdFx0KGFzeW5jICgpID0+XG5cdFx0e1xuXHRcdFx0Ly8gVGhpcyBpcyBhIGh1Z2UgaGFjay4uLiBidXQgd2l0aG91dCB0aGlzLCB0aGUgc2V0dXAgbmVlZHNcblx0XHRcdC8vIHNvbWUgYXN5bmMgd2hpY2ggbWVhbnMgdGhhdCBpdCBjYW4ndCBiZSBkb25lXG5cdFx0XHRjb25zdCB0bXAgPSBhd2FpdCBwYXRoLmFwcENhY2hlRGlyKCk7XG5cdFx0XHRGaWxhLnNldHVwKEZpbGFUYXVyaSwgc2VwLCBjd2QsIHRtcCk7XG5cdFx0fSkoKTtcblx0fVxufSkoKTtcbiIsIlxuLyoqIEBpbnRlcm5hbCAqL1xuZGVjbGFyZSBjb25zdCBXRUI6IGJvb2xlYW47XG5cbigoKSA9Plxue1xuXHRpZiAodHlwZW9mIFdFQiA9PT0gXCJ1bmRlZmluZWRcIilcblx0XHRPYmplY3QuYXNzaWduKGdsb2JhbFRoaXMsIHsgV0VCOiAhTk9ERSAmJiAhQ0FQQUNJVE9SICYmICFUQVVSSSAmJiB0eXBlb2YgaW5kZXhlZERCID09PSBcIm9iamVjdFwiIH0pXG5cdFxuXHQvL0B0cy1pZ25vcmVcblx0aWYgKCFXRUIpIHJldHVybjtcblx0XG5cdHR5cGUgS2V5dmEgPSB0eXBlb2YgaW1wb3J0KFwia2V5dmFqc1wiKTtcblx0XG5cdGNsYXNzIEZpbGFXZWIgZXh0ZW5kcyBGaWxhLkZpbGFCYWNrZW5kXG5cdHtcblx0XHQvKiogQGludGVybmFsICovXG5cdFx0cHJpdmF0ZSBzdGF0aWMga2V5dmE6IEtleXZhO1xuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGNvbnN0cnVjdG9yKGZpbGE6IEZpbGEpXG5cdFx0e1xuXHRcdFx0c3VwZXIoZmlsYSk7XG5cdFx0XHRGaWxhV2ViLmtleXZhIHx8PSBuZXcgS2V5dmEoeyBuYW1lOiBcImZpbGFcIiB9KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZFRleHQoKVxuXHRcdHtcblx0XHRcdHJldHVybiBhd2FpdCBGaWxhV2ViLmtleXZhLmdldDxzdHJpbmc+KHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVhZEJpbmFyeSgpOiBQcm9taXNlPEFycmF5QnVmZmVyPlxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0cmV0dXJuIHZhbHVlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgP1xuXHRcdFx0XHR2YWx1ZSA6XG5cdFx0XHRcdG5ldyBUZXh0RW5jb2RlcigpLmVuY29kZSh2YWx1ZSk7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHJlYWREaXJlY3RvcnkoKVxuXHRcdHtcblx0XHRcdGNvbnN0IGZpbGFzOiBGaWxhW10gPSBbXTtcblx0XHRcdGNvbnN0IHJhbmdlID0gS2V5dmEucHJlZml4KHRoaXMuZmlsYS5wYXRoICsgXCIvXCIpO1xuXHRcdFx0Y29uc3QgY29udGVudHMgPSBhd2FpdCBGaWxhV2ViLmtleXZhLmVhY2goeyByYW5nZSB9LCBcImtleXNcIik7XG5cdFx0XHRcblx0XHRcdGZvciAoY29uc3Qga2V5IG9mIGNvbnRlbnRzKVxuXHRcdFx0XHRpZiAodHlwZW9mIGtleSA9PT0gXCJzdHJpbmdcIilcblx0XHRcdFx0XHRmaWxhcy5wdXNoKG5ldyBGaWxhKGtleSkpO1xuXHRcdFx0XG5cdFx0XHRyZXR1cm4gZmlsYXM7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlVGV4dCh0ZXh0OiBzdHJpbmcsIG9wdGlvbnM/OiBGaWxhLklXcml0ZVRleHRPcHRpb25zKVxuXHRcdHtcblx0XHRcdGxldCBjdXJyZW50ID0gdGhpcy5maWxhLnVwKCk7XG5cdFx0XHRjb25zdCBtaXNzaW5nRm9sZGVyczogRmlsYVtdID0gW107XG5cdFx0XHRcblx0XHRcdGZvciAoOzspXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChhd2FpdCBjdXJyZW50LmV4aXN0cygpKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0bWlzc2luZ0ZvbGRlcnMucHVzaChjdXJyZW50KTtcblx0XHRcdFx0XG5cdFx0XHRcdGlmIChjdXJyZW50LnVwKCkucGF0aCA9PT0gY3VycmVudC5wYXRoKVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcblx0XHRcdFx0Y3VycmVudCA9IGN1cnJlbnQudXAoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdFx0Zm9yIChjb25zdCBmb2xkZXIgb2YgbWlzc2luZ0ZvbGRlcnMpXG5cdFx0XHRcdGF3YWl0IGZvbGRlci53cml0ZURpcmVjdG9yeSgpO1xuXHRcdFx0XG5cdFx0XHRpZiAob3B0aW9ucz8uYXBwZW5kKVxuXHRcdFx0XHR0ZXh0ID0gKFwiXCIgKyAoYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpIHx8IFwiXCIpKSArIHRleHQ7XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCB0ZXh0KTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgd3JpdGVCaW5hcnkoYXJyYXlCdWZmZXI6IEFycmF5QnVmZmVyKVxuXHRcdHtcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCBhcnJheUJ1ZmZlcik7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIHdyaXRlRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRpZiAoYXdhaXQgdGhpcy5pc0RpcmVjdG9yeSgpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdGlmIChhd2FpdCB0aGlzLmV4aXN0cygpKVxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJBIGZpbGUgYWxyZWFkeSBleGlzdHMgYXQgdGhpcyBsb2NhdGlvbi5cIik7XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuc2V0KHRoaXMuZmlsYS5wYXRoLCBudWxsKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogV3JpdGVzIGEgc3ltbGluayBmaWxlIGF0IHRoZSBsb2NhdGlvbiByZXByZXNlbnRlZCBieSB0aGUgc3BlY2lmaWVkXG5cdFx0ICogRmlsYSBvYmplY3QsIHRvIHRoZSBsb2NhdGlvbiBzcGVjaWZpZWQgYnkgdGhlIGN1cnJlbnQgRmlsYSBvYmplY3QuXG5cdFx0ICovXG5cdFx0YXN5bmMgd3JpdGVTeW1saW5rKGF0OiBGaWxhKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqXG5cdFx0ICogRGVsZXRlcyB0aGUgZmlsZSBvciBkaXJlY3RvcnkgdGhhdCB0aGlzIEZpbGEgb2JqZWN0IHJlcHJlc2VudHMuXG5cdFx0ICovXG5cdFx0YXN5bmMgZGVsZXRlKCk6IFByb21pc2U8RXJyb3IgfCB2b2lkPlxuXHRcdHtcblx0XHRcdGlmIChhd2FpdCB0aGlzLmlzRGlyZWN0b3J5KCkpXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHJhbmdlID0gS2V5dmEucHJlZml4KHRoaXMuZmlsYS5wYXRoICsgXCIvXCIpO1xuXHRcdFx0XHRhd2FpdCBGaWxhV2ViLmtleXZhLmRlbGV0ZShyYW5nZSk7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdGF3YWl0IEZpbGFXZWIua2V5dmEuZGVsZXRlKHRoaXMuZmlsYS5wYXRoKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgbW92ZSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgY29weSh0YXJnZXQ6IEZpbGEpXG5cdFx0e1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkLlwiKTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0d2F0Y2hQcm90ZWN0ZWQoXG5cdFx0XHRyZWN1cnNpdmU6IGJvb2xlYW4sXG5cdFx0XHRjYWxsYmFja0ZuOiAoZXZlbnQ6IEZpbGEuRXZlbnQsIGZpbGE6IEZpbGEsIHNlY29uZGFyeUZpbGE/OiBGaWxhKSA9PiB2b2lkKVxuXHRcdHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBpbXBsZW1lbnRlZFwiKTtcblx0XHRcdHJldHVybiAoKSA9PiB7fTtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgcmVuYW1lKG5ld05hbWU6IHN0cmluZylcblx0XHR7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQuXCIpO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBleGlzdHMoKVxuXHRcdHtcblx0XHRcdGNvbnN0IHZhbHVlID0gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpO1xuXHRcdFx0cmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQ7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGdldFNpemUoKVxuXHRcdHtcblx0XHRcdHJldHVybiAwO1xuXHRcdH1cblx0XHRcblx0XHQvKiogKi9cblx0XHRhc3luYyBnZXRNb2RpZmllZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0Q3JlYXRlZFRpY2tzKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0XG5cdFx0LyoqICovXG5cdFx0YXN5bmMgZ2V0QWNjZXNzZWRUaWNrcygpXG5cdFx0e1xuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fVxuXHRcdFxuXHRcdC8qKiAqL1xuXHRcdGFzeW5jIGlzRGlyZWN0b3J5KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gYXdhaXQgRmlsYVdlYi5rZXl2YS5nZXQodGhpcy5maWxhLnBhdGgpID09PSBudWxsO1xuXHRcdH1cblx0fVxuXHRcblx0RmlsYS5zZXR1cChGaWxhV2ViLCBcIi9cIiwgXCIvXCIsIFwiL19fdGVtcC9cIik7XG59KSgpOyJdfQ==