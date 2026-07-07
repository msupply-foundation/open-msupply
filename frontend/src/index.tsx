/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import { ShowcaseApp } from './showcase/ShowcaseApp.tsx'

const root = document.getElementById('root')

// The showcase is the app for now; the real app shell replaces this entry later.
render(() => <ShowcaseApp />, root!)
