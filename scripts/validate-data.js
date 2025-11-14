#!/usr/bin/env node
// Quick validation script to ensure data JSON files conform to expected shape
import fs from 'fs'
import path from 'path'

const base = path.resolve(process.cwd(), 'data')

function readJSON(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8')
  try {
    return JSON.parse(text)
  } catch (err) {
    console.error(`Invalid JSON in ${filePath}:`, err.message)
    process.exitCode = 2
    return null
  }
}

function validateCharacter(obj, file) {
  const errs = []
  if (!obj || typeof obj !== 'object') errs.push('must be an object')
  if (!obj.id || typeof obj.id !== 'string' || obj.id.length === 0) errs.push('id must be non-empty string')
  if (!obj.name || typeof obj.name !== 'string' || obj.name.length === 0) errs.push('name must be non-empty string')
  if (!obj.summary || typeof obj.summary !== 'string' || obj.summary.length === 0) errs.push('summary must be non-empty string')
  if (!obj.backstory || typeof obj.backstory !== 'string' || obj.backstory.length === 0) errs.push('backstory must be non-empty string')
  if (!obj.personality || typeof obj.personality !== 'string' || obj.personality.length === 0) errs.push('personality must be non-empty string')
  if (!Array.isArray(obj.goals) || obj.goals.some(g => typeof g !== 'string' || g.length === 0)) errs.push('goals must be an array of non-empty strings')
  if (!obj.speakingStyle || typeof obj.speakingStyle !== 'string' || obj.speakingStyle.length === 0) errs.push('speakingStyle must be non-empty string')
  if (obj.tags && (!Array.isArray(obj.tags) || obj.tags.some(t => typeof t !== 'string' || t.length === 0))) errs.push('tags must be an array of non-empty strings')
  if (errs.length) {
    console.error(`Validation errors in ${file}:`) 
    errs.forEach(e => console.error('-', e))
    process.exitCode = 3
  }
}

function validateSetting(obj, file) {
  const errs = []
  if (!obj || typeof obj !== 'object') errs.push('must be an object')
  if (!obj.id || typeof obj.id !== 'string' || obj.id.length === 0) errs.push('id must be non-empty string')
  if (!obj.name || typeof obj.name !== 'string' || obj.name.length === 0) errs.push('name must be non-empty string')
  if (!obj.lore || typeof obj.lore !== 'string' || obj.lore.length === 0) errs.push('lore must be non-empty string')
  if (!obj.tone || typeof obj.tone !== 'string' || obj.tone.length === 0) errs.push('tone must be non-empty string')
  if (obj.constraints && (!Array.isArray(obj.constraints) || obj.constraints.some(t => typeof t !== 'string' || t.length === 0))) errs.push('constraints must be an array of non-empty strings')
  if (errs.length) {
    console.error(`Validation errors in ${file}:`) 
    errs.forEach(e => console.error('-', e))
    process.exitCode = 3
  }
}

function run() {
  let ok = true
  const charDir = path.join(base, 'characters')
  const settingDir = path.join(base, 'settings')
  if (fs.existsSync(charDir)) {
    for (const f of fs.readdirSync(charDir)) {
      if (!f.endsWith('.json')) continue
      const p = path.join(charDir, f)
      const obj = readJSON(p)
      if (!obj) { ok = false; continue }
      validateCharacter(obj, p)
      if (process.exitCode) ok = false
    }
  }
  if (fs.existsSync(settingDir)) {
    for (const f of fs.readdirSync(settingDir)) {
      if (!f.endsWith('.json')) continue
      const p = path.join(settingDir, f)
      const obj = readJSON(p)
      if (!obj) { ok = false; continue }
      validateSetting(obj, p)
      if (process.exitCode) ok = false
    }
  }
  if (!ok) {
    console.error('Validation failed')
    process.exitCode = process.exitCode || 1
  } else {
    console.log('All JSON data files are valid (basic checks passed).')
  }
}

run()
