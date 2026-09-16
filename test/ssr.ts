import { test } from '@substrate-system/tapzero'
import { render } from '../src/html.js'

test('server-side render', t => {
    const htmlString = render({
        alt: 'hello',
        width: 30,
        classes: 'ok',
        height: 30,
        placeholder: 'UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV',
        src: 'abc.jpg'
    })

    const blurHashEl = htmlString.substring(
        htmlString.indexOf('<'),
        htmlString.indexOf('>') + 1
    )

    t.ok(blurHashEl.includes('alt="hello" width="30" classes="ok" height="30" ' +
        'placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV" src="abc.jpg"'))

    t.ok(htmlString.includes('<blur-hash'), 'should include the custom element')
    t.ok(htmlString.includes('<canvas'), 'should include a canvas element')
    t.ok(!htmlString.includes('blurry'),
        'initial HTML should not include the blurry class')
    t.ok(htmlString)
})
