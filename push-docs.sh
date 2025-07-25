#!/bin/bash

# Push Documentation Script for Sentinel AI
# Run this script to push all documentation to GitHub

echo "🚀 Pushing Sentinel AI Documentation to GitHub..."
echo "================================================"

# Navigate to project directory
cd /Users/ryantham/projects/AI-Content-Safety-Agent

# Check Git status
echo "📋 Checking Git status..."
git status

# Add all documentation files
echo "📁 Adding documentation files..."
git add README.md
git add TECHNICAL_README.md
git add docs/ARCHITECTURE.md
git add docs/API_DOCUMENTATION.md
git add docs/DEPLOYMENT.md
git add CONTRIBUTING.md

# Show what will be committed
echo "📝 Files to be committed:"
git status --staged

# Commit with comprehensive message
echo "💾 Creating commit..."
git commit -m "docs: Add comprehensive technical documentation suite

- Add TECHNICAL_README.md with detailed system architecture and setup guide
- Add docs/ARCHITECTURE.md with visual diagrams and component breakdown  
- Add docs/API_DOCUMENTATION.md with complete API reference and examples
- Add docs/DEPLOYMENT.md with Docker, Kubernetes, and cloud deployment guides
- Add CONTRIBUTING.md with development workflow and contribution guidelines
- Update README.md with documentation navigation links

Features documented:
- Multi-modal AI detection system (text, image, video, audio)
- Real-time trend analysis and early warning system
- Cross-platform content ingestion (10+ platforms)
- Scalable architecture (1M+ to 50M+ items/hour)
- Production-ready deployment configurations
- Comprehensive security and monitoring setup

Comprehensive documentation update for production deployment."

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Documentation successfully pushed to GitHub!"
echo "🌐 View at: https://github.com/ryanthaam/AI-Content-Safety-Agent"
echo "📅 Updated: $(date '+%B %d, %Y')"