import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from '@substrate-system/tapzero'

test('the ./html export resolves from the packed tarball', t => {
    const dir = mkdtempSync(join(tmpdir(), 'blur-hash-pack-'))
    try {
        const out = execFileSync('npm', [
            'pack', '--json', '--pack-destination', dir
        ], { encoding: 'utf8' })
        // npm 10+ keys the output by package name; older npm used an array
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
        const result = execFileSync('node', [join(dir, 'check.mjs')], {
            encoding: 'utf8',
            cwd: dir
        })
        t.equal(result, 'function', 'imports outerHTML from /html')
    } finally {
        rmSync(dir, { recursive: true, force: true })
    }
})
