#!/usr/bin/env node
import yargs from 'yargs'
import sharp from 'sharp'
import { hideBin } from 'yargs/helpers'
import { encode } from 'blurhash'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Create a string for blur-hash.
 */
export const createString = async (
    filepath:string,
):Promise<string> => {
    const { data, info } = await sharp(filepath)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true })

    return encode(new Uint8ClampedArray(data.buffer), info.width, info.height, 4, 4)
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

    const filename = args._[0]
    const hash = await createString(filename)
    process.stdout.write(hash + '\n')
}
