declare class Fila {
    private static backend;
    /**
     * Path separator.
     */
    static get sep(): "/" | "\\";
    private static _sep;
    /**
     * Gets the current working directory of the process.
     */
    static get cwd(): Fila;
    private static _cwd;
    /**
     *
     */
    static get temporary(): Fila;
    private static _temporary;
    /**
     * Returns a Fila instance from the specified path in the case when
     * a string is provided, or returns the Fila instance as-is when a Fila
     * object is provided.
     */
    static from(via: string | Fila): Fila;
    /** */
    constructor(...components: string[]);
    readonly components: string[];
    private readonly back;
    /** */
    readText(): Promise<string>;
    /** */
    readBinary(): Promise<ArrayBuffer>;
    /** */
    readDirectory(): Promise<Fila[]>;
    /** */
    writeText(text: string, options?: Fila.IWriteTextOptions): Promise<void>;
    /** */
    writeBinary(buffer: ArrayBuffer): Promise<void>;
    /** */
    writeDirectory(): Promise<void>;
    /**
     * Writes a symlink file at the location represented by the specified
     * Fila object, to the location specified by the current Fila object.
     */
    writeSymlink(at: Fila): Promise<void>;
    /**
     * Deletes the file or directory that this Fila object represents.
     */
    delete(): Promise<Error | void>;
    /** */
    move(target: Fila): Promise<void>;
    /**
     * Copies the file to the specified location, and creates any
     * necessary directories along the way.
     */
    copy(target: Fila): Promise<void>;
    /**
     * Recursively watches this folder, and all nested files contained
     * within all subfolders. Returns a function that terminates
     * the watch service when called.
     */
    watch(recursive: "recursive", callbackFn: (event: Fila.Event, fila: Fila) => void): () => void;
    /**
     * Watches for changes to the specified file or folder. Returns
     * a function that terminates the watch service when called.
     */
    watch(callbackFn: (event: Fila.Event, fila: Fila) => void): () => void;
    /** */
    protected watchProtected(recursive: boolean, callbackFn: (event: Fila.Event, fila: Fila) => void): () => void;
    /** */
    rename(newName: string): Promise<void>;
    /** */
    exists(): Promise<boolean>;
    /** */
    getSize(): Promise<number>;
    /** */
    getModifiedTicks(): Promise<number>;
    /** */
    getCreatedTicks(): Promise<number>;
    /** */
    getAccessedTicks(): Promise<number>;
    /** */
    isDirectory(): Promise<boolean>;
    /**
     * In the case when this Fila object represents a file, this method returns a
     * Fila object that represents the directory that contains said file.
     *
     * In the case when this Fila object represents a directory, this method
     * returns the current Fila object as-is.
     */
    getDirectory(): Promise<Fila>;
    /**
     * Gets the file or directory name of the file system object being
     * represented by this Fila object.
     */
    get name(): string;
    /**
     * Get the file extension of the file being represented by this
     * Fila object, with the "." character.
     */
    get extension(): string;
    /**
     * Gets the fully-qualified path, including any file name to the
     * file system object being represented by this Fila object.
     */
    get path(): string;
    /**
     * Returns a Fila object that represents the first or nth containing
     * directory of the object that this Fila object represents.
     * Returns the this reference in the case when the
     */
    up(count?: number): Fila;
    /**
     * Searches upward through the file system ancestry for a nested file.
     */
    upscan(relativeFileName: string): Promise<Fila | null>;
    /**
     * Returns a Fila object that represents a file or directory nested
     * within the current Fila object (which must be a directory).
     */
    down(...additionalComponents: string[]): Fila;
}
declare namespace Fila {
    /** */
    interface IWriteTextOptions {
        readonly append: boolean;
    }
    /** */
    function join(...args: string[]): string;
    /** */
    function normalize(path: string): string;
    /** */
    function relative(from: string | Fila, to: string | Fila): string;
    /** */
    const enum Event {
        create = "create",
        modify = "modify",
        delete = "delete"
    }
}
declare module "@squaresapp/fila" {
    export = Fila;
}
//# sourceMappingURL=fila.d.ts.map