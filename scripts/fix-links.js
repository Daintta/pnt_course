#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define link replacements
const linkReplacements = [
  {
    module: 'm02',
    old: 'https://www.gps.gov/technical',
    new: 'https://www.gps.gov/technical-documentation'
  },
  {
    module: 'm04',
    old: 'https://www.gsc-europa.eu/egnos',
    new: 'https://egnos.gsc-europa.eu/egnos-system/about-egnos'
  },
  {
    module: 'm04',
    old: 'https://www.gps.gov/augmentation',
    new: 'https://www.gps.gov/augmentation-systems'
  },
  {
    module: 'm06',
    old: 'https://www.gps.gov/gps-threats',
    new: 'https://www.gps.gov/spectrum-interference-issues'
  }
];

// URLs to add (if not already present)
const linkAdditions = [
  {
    module: 'm06',
    url: 'https://pages.nist.gov/mobile-threat-catalogue/gps.html',
    searchText: 'NIST: Mobile Threat Catalogue'
  }
];

function fixModule(modulePath) {
  const content = fs.readFileSync(modulePath, 'utf8');

  // Extract JSON from PNT.registerModule(...)
  // Match PNT.registerModule({...}); possibly with newline
  const jsonMatch = content.match(/PNT\.registerModule\((\{[\s\S]*\})\)\s*;?\s*$/);
  if (!jsonMatch) {
    console.error(`Invalid module format: ${modulePath}`);
    return false;
  }

  let module;
  try {
    module = JSON.parse(jsonMatch[1]);
  } catch (e) {
    console.error(`JSON parse error in ${modulePath}:`, e.message);
    return false;
  }

  // Get replacements for this module
  const moduleName = path.basename(modulePath).replace('.js', '');
  const replacements = linkReplacements.filter(r => r.module === moduleName);

  let modified = false;
  replacements.forEach(replacement => {
    // Search in all lessons
    module.lessons.forEach(lesson => {
      if (lesson.html && lesson.html.includes(replacement.old)) {
        console.log(`  Replacing in ${moduleName}: ${replacement.old.substring(0, 40)}...`);
        // Replace whole URLs only. The new URL starts with the old one, so a plain
        // string replace would append the suffix again on every run.
        const oldUrl = new RegExp(replacement.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])', 'g');
        lesson.html = lesson.html.replace(oldUrl, replacement.new);
        modified = true;
      }
    });
  });

  // Handle link additions
  const additions = linkAdditions.filter(a => a.module === moduleName);
  additions.forEach(addition => {
    // Find the "Further Learning" lesson and add link if not already there
    const furtherLearningLesson = module.lessons.find(l => l.id === 'further-learning');
    if (furtherLearningLesson && furtherLearningLesson.html) {
      if (!furtherLearningLesson.html.includes(addition.url)) {
        console.log(`  Adding in ${moduleName}: ${addition.searchText}...`);
        // Find the GPS interference link and add NIST link right after it
        const gpsInterferencePattern = /(<a href="https:\/\/www\.gps\.gov\/spectrum-interference-issues"[^<]*<\/a><\/p>)/;
        const newLink = `$1\n<p><strong>${addition.searchText}</strong><br/>\nCyberattack patterns and threat models for GPS and GNSS systems.<br/>\n<a href="${addition.url}">NIST Mobile Threat Catalogue</a></p>`;
        furtherLearningLesson.html = furtherLearningLesson.html.replace(gpsInterferencePattern, newLink);
        modified = true;
      }
    }
  });

  if (modified) {
    // Write back preserving original header
    const header = content.split('\n').slice(0, 1).join('\n');
    const output = header ? header + '\n' + `PNT.registerModule(${JSON.stringify(module)})` : `PNT.registerModule(${JSON.stringify(module)})`;
    fs.writeFileSync(modulePath, output);
    console.log(`✓ Updated ${modulePath}`);
    return true;
  }
  return false;
}

// Process modules
console.log('Fixing broken resource links...\n');

const modulesDir = path.join(__dirname, '..', 'content', 'modules');
const modules = ['m02.js', 'm04.js', 'm06.js'];

let updated = 0;
modules.forEach(module => {
  const modulePath = path.join(modulesDir, module);
  if (fs.existsSync(modulePath)) {
    if (fixModule(modulePath)) {
      updated++;
    }
  }
});

console.log(`\n✓ Fixed ${updated} module(s)`);
