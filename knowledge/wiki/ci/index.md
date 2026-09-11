# CI

Continuous integration setup for the project, pipeline configuration, build and test workflows, and the conventions that govern when they run. Covers signing, artifact handling, and how a failing check gets diagnosed.

# Concepts

- [Test Suite Workflow](test-suite-workflow.md) - What the single CI check runs (install, build, test on Node 20/22/24 for every push), what it deliberately or accidentally does not run, and how to read its failures.
- [Ship.js Release Workflows](shipjs-release-workflows.md) - How the two Ship.js GitHub workflows prepare and publish a lockstep release of every package, the secrets they need, and a script mismatch in the manual-prepare workflow.
