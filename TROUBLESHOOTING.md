# 🛠 Troubleshooting Guide – Personal Blog (Gatsby + MDX)

This document contains solutions to major integration issues faced while building this blog using Gatsby v4 and MDX.

---

## ✅ Resolved Issues

### 1. Plugin Version Mismatch

Error:  
gatsby-plugin-mdx is not compatible with your gatsby version 5.x

Fix:  
Downgraded to these compatible versions:  
- gatsby: 4.24.0  
- gatsby-plugin-mdx: 2.0.0

---

### 2. Missing `@mdx-js/mdx` Dependency

Error:  
Cannot find module '@mdx-js/mdx'

Fix:  
Install the correct version:  
npm install @mdx-js/mdx@1.6.22 --save

---

### 3. Invalid Plugin Options

Warning:  
Unknown plugin options for "gatsby-plugin-mdx": provideExternalSourceNode, mdxOptions

Fix:  
Remove these unsupported options from your gatsby-config.js file.

---

### 4. AJV Version Conflict

Error:  
Cannot find module 'ajv/dist/compile/codegen'

Cause:  
ajv-keywords@5.x is incompatible with ajv@8.

Fix:  
Run the following commands:  
npm uninstall ajv ajv-keywords  
npm install ajv@6.12.6 ajv-keywords@3.5.2 --legacy-peer-deps

---

## 💡 Best Practices

- Stick to plugin versions compatible with your Gatsby version.
- Remove undocumented/unsupported plugin options.
- Use a .nvmrc file to lock your Node version (example: 18.20.2).
- Run `gatsby clean` after making any changes to dependencies or configuration.
- Use `npm ls` and `npm outdated` to investigate version issues.

---

## 📦 Known Good Dependency Set

gatsby: 4.24.0  
gatsby-plugin-mdx: 2.0.0  
@mdx-js/mdx: 1.6.22  
@mdx-js/react: 1.6.22  
ajv: 6.12.6  
ajv-keywords: 3.5.2

---

## 🧪 Node.js Version

Recommended Node version:  
18.20.2 (set this in your .nvmrc file)

---

## 🧼 Clean Install Commands

To reset and install everything correctly:

rm -rf node_modules package-lock.json .cache public  
npm install --legacy-peer-deps  
gatsby clean  
gatsby develop
