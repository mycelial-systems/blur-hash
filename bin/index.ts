#!/usr/bin/env node
//
// Documents this file's dependency on @types/node explicitly. Ambient
// declarations from a referenced types package apply to the whole
// compilation, not just this file -- this directive does not scope
// Node globals to bin/ alone.
//
/// <reference types="node" />
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodeImage } from './photon.js'

/**
 * Create a blur-hash from a local image file.
 */
export async function createBlurhash (
    filepath:string
):Promise<{ hash:string; width:number; height:number }> {
    const bytes = await readFile(filepath)
    return encodeImage(new Uint8Array(bytes))
}

const pathToThisFile = resolve(fileURLToPath(import.meta.url))
const pathPassedToNode = resolve(process.argv[1])
const isThisFileBeingRunViaCLI = pathToThisFile.includes(pathPassedToNode)

if (isThisFileBeingRunViaCLI) {
    const args = yargs(hideBin(process.argv))
        .demandCommand(1)
        .command('filename', 'the local filename to read')
        .example('`npx blur my-fiile.jpg`',
            'Create a small placeholder string from a local file')
        .usage('Usage: blur <filename>')
        .argv

    const filename = args._[0] as string
    const result = await createBlurhash(filename)
    process.stdout.write(result.hash + '\n')
}
