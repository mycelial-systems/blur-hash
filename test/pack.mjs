import { execFileSync } from 'node:child_process'
import {
    mkdtempSync,
    mkdirSync,
    writeFileSync,
    readFileSync,
    existsSync,
    rmSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from '@substrate-system/tapzero'

test('the ./html export resolves from the packed tarball', t => {
    const dir = mkdtempSync(join(tmpdir(), 'blur-hash-pack-'))
    try {
        const out = execFileSync('npm', [
            'pack', '--json', '--pack-destination', dir
        ], { encoding: 'utf8' })
        // newer npm keys the output by package name; older npm returns
        // an array
        const parsed = JSON.parse(out)
        const info = Array.isArray(parsed) ?
            parsed[0] :
            Object.values(parsed)[0]
        const { filename } = info
        const pkgDir = join(dir, 'node_modules', '@substrate-system',
            'blur-hash')
        mkdirSync(pkgDir, { recursive: true })
        execFileSync('tar', [
            '-xzf', join(dir, filename), '-C', pkgDir,
            '--strip-components=1'
        ])

        writeFileSync(join(dir, 'check.mjs'),
            "import { outerHTML } from '@substrate-system/blur-hash/html'\n" +
            'process.stdout.write(typeof outerHTML)\n')
        const esm = execFileSync('node', [join(dir, 'check.mjs')], {
            encoding: 'utf8',
            cwd: dir
        })
        t.equal(esm, 'function', 'import condition exports outerHTML')

        writeFileSync(join(dir, 'check.cjs'),
            "const { outerHTML } = " +
            "require('@substrate-system/blur-hash/html')\n" +
            'process.stdout.write(typeof outerHTML)\n')
        const cjs = execFileSync('node', [join(dir, 'check.cjs')], {
            encoding: 'utf8',
            cwd: dir
        })
        t.equal(cjs, 'function', 'require condition exports outerHTML')

        const pkg = JSON.parse(readFileSync(
            join(pkgDir, 'package.json'), 'utf8'
        ))
        const typesPath = pkg.exports['./html'].types
        t.ok(existsSync(join(pkgDir, typesPath)),
            'the types condition points at an unpacked file')
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
})
