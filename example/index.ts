/// <reference types="vite/client" />
import { qs } from '@substrate-system/dom'
import imgUrl from './100.jpg'
import llamas from './llamas.jpg'
import { BlurHash } from '../src/index.js'
import '../src/index.css'
import './example.css'

BlurHash.define()

// the string from CLI for the 100 cat
// UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV

const noDelayTag = `<blur-hash
    width="400px"
    height="400px"
    placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
    alt="cool cat"
    src="${imgUrl}"
></blur-hash>`

const defaultDelayTag = `<blur-hash
    width="400px"
    height="400px"
    placeholder="UgI}q#%O%eNa?^I?awaf?aIVs*WBxZxaRjR*"
    alt="some llamas"
    src="${llamas}"
    delay
></blur-hash>`

const explicitDelayTag = `<blur-hash
    width="400px"
    height="400px"
    placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
    alt="cool cat"
    src="${imgUrl}"
    delay="200"
></blur-hash>`

document.body.innerHTML += `
    <div>
        <p>no <code>delay</code> attribute &mdash; always blurs up</p>
        <pre>${escapeHtml(noDelayTag)}</pre>
        <blur-hash
            width="400px"
            height="400px"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
            alt="cool cat"
            src=${imgUrl}
        ></blur-hash>
    </div>

    <hr />

    <div>
        <p><code>delay</code> attribute, no value &mdash; defaults to 75ms</p>
        <pre>${escapeHtml(defaultDelayTag)}</pre>
        <blur-hash
            width="400px"
            height="400px"
            placeholder="UgI}q#%O%eNa?^I?awaf?aIVs*WBxZxaRjR*"
            alt="some llamas"
            src=${llamas}
            delay
        ></blur-hash>
    </div>

    <hr />

    <div>
        <p><code>delay="200"</code> &mdash; waits 200ms before blurring up</p>
        <pre>${escapeHtml(explicitDelayTag)}</pre>
        <blur-hash
            width="400px"
            height="400px"
            placeholder="UHGIM_X900xC~XWFE0xt00o3%1oz-;t7i|IV"
            alt="cool cat"
            src=${imgUrl}
            delay="200"
        ></blur-hash>
    </div>

    <hr />

    <div>
        <button>Reset image src</button>
    </div>
`

qs('button')?.addEventListener('click', ev => {
    ev.preventDefault()
    qs('blur-hash')?.reset({
        src: llamas,
        alt: 'some llamas',
        placeholder: 'UgI}q#%O%eNa?^I?awaf?aIVs*WBxZxaRjR*'
    })
})

function escapeHtml (str:string):string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}
