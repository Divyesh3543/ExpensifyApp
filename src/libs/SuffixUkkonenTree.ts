const CHAR_CODE_A = 'a'.charCodeAt(0);
const ALPHABET_SIZE = 28;
const DELIMITER_CHAR_CODE = ALPHABET_SIZE - 2;

// TODO:
// make makeTree faster
// how to deal with unicode characters such as spanish ones?
// i think we need to support numbers as well

/**
 * Converts a string to an array of numbers representing the characters of the string.
 * The numbers are offset by the character code of 'a' (97).
 * - This is so that the numbers from a-z are in the range 0-25.
 * - 26 is for the delimiter character "{",
 * - 27 is for the end character "|".
 */
function stringToArray(input: string) {
    const res: number[] = [];
    for (let i = 0; i < input.length; i++) {
        const charCode = input.charCodeAt(i) - CHAR_CODE_A;
        if (charCode >= 0 && charCode < ALPHABET_SIZE) {
            res.push(charCode);
        }
    }
    return res;
}

const aToZRegex = /[^a-z]/gi;
// The character that separates the different options in the search string
const DELIMITER_CHAR = String.fromCharCode(DELIMITER_CHAR_CODE + CHAR_CODE_A);

type PrepareDataParams<T> = {
    data: T[];
    transform: (data: T) => string;
};

function cleanedString(input: string) {
    return input.toLowerCase().replace(aToZRegex, '');
}

function prepareData<T>({data, transform}: PrepareDataParams<T>): [string, Array<T | undefined>] {
    const searchIndexList: Array<T | undefined> = [];
    const str = data
        .map((option) => {
            const searchStringForTree = transform(option);
            // Remove all none a-z chars:
            const cleanedSearchStringForTree = cleanedString(searchStringForTree);

            if (cleanedSearchStringForTree.length > 0) {
                // We need to push an array that has the same length as the length of the string we insert for this option:
                const indexes = Array.from({length: cleanedSearchStringForTree.length}, () => option);
                // Note: we add undefined for the delimiter character
                searchIndexList.push(...indexes, undefined);
            } else {
                return undefined;
            }

            return cleanedSearchStringForTree;
        })
        // slightly faster alternative to `.filter(Boolean).join(delimiterChar)`
        .reduce((acc: string, curr) => {
            if (!curr) {
                return acc;
            }

            if (acc === '') {
                return curr;
            }

            return `${acc}${DELIMITER_CHAR}${curr}`;
        }, '');

    return [str, searchIndexList];
}

/**
 * Makes a tree from an input string
 */
function makeTree<T>(lists: Array<PrepareDataParams<T>>) {
    const start1 = performance.now();
    const stringForList: string[] = [];

    // We might received multiple lists of data that we want to search in
    // thus indexes is a list of those data lists
    const indexesForList: Array<Array<T | undefined>> = [];

    for (const {data, transform} of lists) {
        const [str, searchIndexList] = prepareData({data, transform});
        stringForList.push(str);
        indexesForList.push(searchIndexList);
    }
    const stringToSearch = `${stringForList.join('')}|`; // End Character
    console.log('building search strings', performance.now() - start1);

    const a = stringToArray(stringToSearch);
    console.log('Search String length', stringToSearch.length);
    const N = 25_000; // TODO: i reduced this number from 1_000_000 down to this, for faster performance - however its possible that it needs to be bigger for larger search strings
    const start = performance.now();
    const t = Array.from({length: N}, () => Array<number>(ALPHABET_SIZE).fill(-1));
    const l = Array<number>(N).fill(0);
    const r = Array<number>(N).fill(0);
    const p = Array<number>(N).fill(0);
    const s = Array<number>(N).fill(0);
    const end = performance.now();
    console.log('Allocating memory took:', end - start, 'ms');

    let tv = 0;
    let tp = 0;
    let ts = 2;
    let la = 0;

    function initializeTree() {
        r.fill(a.length - 1);
        s[0] = 1;
        l[0] = -1;
        r[0] = -1;
        l[1] = -1;
        r[1] = -1;
        t[1].fill(0);
    }

    function processCharacter(c: number) {
        while (true) {
            if (r[tv] < tp) {
                if (t[tv][c] === -1) {
                    createNewLeaf(c);
                    continue;
                }
                tv = t[tv][c];
                tp = l[tv];
            }
            if (tp === -1 || c === a[tp]) {
                tp++;
            } else {
                splitEdge(c);
                continue;
            }
            break;
        }
        if (c === DELIMITER_CHAR_CODE) {
            resetTreeTraversal();
        }
    }

    function createNewLeaf(c: number) {
        t[tv][c] = ts;
        l[ts] = la;
        p[ts++] = tv;
        tv = s[tv];
        tp = r[tv] + 1;
    }

    function splitEdge(c: number) {
        l[ts] = l[tv];
        r[ts] = tp - 1;
        p[ts] = p[tv];
        t[ts][a[tp]] = tv;
        t[ts][c] = ts + 1;
        l[ts + 1] = la;
        p[ts + 1] = ts;
        l[tv] = tp;
        p[tv] = ts;
        t[p[ts]][a[l[ts]]] = ts;
        ts += 2;
        handleDescent(ts);
    }

    function handleDescent(ts: number) {
        tv = s[p[ts - 2]];
        tp = l[ts - 2];
        while (tp <= r[ts - 2]) {
            tv = t[tv][a[tp]];
            tp += r[tv] - l[tv] + 1;
        }
        if (tp === r[ts - 2] + 1) {
            s[ts - 2] = tv;
        } else {
            s[ts - 2] = ts;
        }
        tp = r[tv] - (tp - r[ts - 2]) + 2;
    }

    function resetTreeTraversal() {
        tv = 0;
        tp = 0;
    }

    function build() {
        initializeTree();
        for (la = 0; la < a.length; ++la) {
            const c = a[la];
            processCharacter(c);
        }
    }

    /**
     * Returns all occurrences of the given (sub)string in the input string.
     *
     * You can think of the tree that we create as a big string that looks like this:
     *
     * "banana{pancake{apple|"
     * The delimiter character '{' is used to separate the different strings.
     * The end character '|' is used to indicate the end of our search string.
     *
     * This function will return the index(es) of found occurrences within this big string.
     * So, when searching for "an", it would return [1, 4, 11].
     */
    // function findSubstring(searchString: string) {
    //     const occurrences: number[] = [];
    //     // const cleanedSearchString = cleanedString(searchString);
    //     // const numericSearchQuery = stringToArray(cleanedSearchString);

    //     function dfs(node: number, depth: number) {
    //         const leftRange = l[node];
    //         const rightRange = r[node];
    //         const rangeLen = node === 0 ? 0 : rightRange - leftRange + 1;

    //         for (let i = 0; i < rangeLen && depth + i < searchString.length; i++) {
    //             if (searchString.charCodeAt(depth + i) - CHAR_CODE_A !== a[leftRange + i]) {
    //                 return;
    //             }
    //         }

    //         let isLeaf = true;
    //         for (let i = 0; i < ALPHABET_SIZE; ++i) {
    //             if (t[node][i] !== -1) {
    //                 isLeaf = false;
    //                 dfs(t[node][i], depth + rangeLen);
    //             }
    //         }

    //         if (isLeaf && depth >= searchString.length) {
    //             occurrences.push(a.length - (depth + rangeLen));
    //         }
    //     }

    //     dfs(0, 0);
    //     return occurrences;
    // }

    // TODO: replace, other search function is broken in edge cases we need to address first
    function findSubstring(sString: string) {
        const s = stringToArray(sString);
        const occurrences: number[] = [];
        const st: Array<[number, number]> = [[0, 0]];

        while (st.length > 0) {
            const [node, depth] = st.pop()!;

            let isLeaf = true;
            const leftRange = l[node];
            const rightRange = r[node];
            const rangeLen = node === 0 ? 0 : rightRange - leftRange + 1;

            let matches = true;
            for (let i = 0; i < rangeLen && depth + i < s.length; i++) {
                if (s[depth + i] !== a[leftRange + i]) {
                    matches = false;
                    break;
                }
            }

            if (!matches) {
                continue;
            }

            for (let i = ALPHABET_SIZE - 1; i >= 0; --i) {
                if (t[node][i] !== -1) {
                    isLeaf = false;
                    st.push([t[node][i], depth + rangeLen]);
                }
            }

            if (isLeaf && depth + rangeLen >= s.length) {
                occurrences.push(a.length - (depth + rangeLen));
            }
        }

        return occurrences;
    }

    function findInSearchTree(searchInput: string): T[][] {
        const now = performance.now();
        const result = findSubstring(searchInput);
        console.log('FindSubstring index result for searchInput', searchInput, result);

        // Map the results to the original options
        const mappedResults = Array.from({length: lists.length}, () => new Set<T>());
        result.forEach((index) => {
            let offset = 0;
            for (let i = 0; i < indexesForList.length; i++) {
                const relativeIndex = index - offset + 1;
                if (relativeIndex < indexesForList[i].length && relativeIndex >= 0) {
                    const option = indexesForList[i][relativeIndex];
                    if (option) {
                        mappedResults[i].add(option);
                    }
                } else {
                    offset += indexesForList[i].length;
                }
            }
        });

        console.log('search', performance.now() - now);
        return mappedResults.map((set) => Array.from(set));
    }

    return {
        build,
        findSubstring,
        findInSearchTree,
    };
}

export {makeTree, prepareData};
