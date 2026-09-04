#!/usr/bin/env bash
#
# pnpm-audit-gate.sh — run `pnpm audit` as a CI gate that fails on
# vulnerabilities but not on a flaky network.
#
# WHY THIS EXISTS
#   `pnpm audit` posts the dependency tree to
#   https://registry.npmjs.org/-/npm/v1/security/audits and reports what comes
#   back. pnpm's own retry gives up after ~3 tries, and when the registry is
#   slow the command exits non-zero with ERR_SOCKET_TIMEOUT. A bare
#   `run: pnpm audit --audit-level=high` therefore turns a transient npm blip
#   into a red security gate. That happened on main at 2026-09-04T10:01Z: the
#   only failing job in the run was this one, and the log shows three socket
#   timeouts and zero advisories.
#
#   A red gate that does not mean "you have a vulnerability" is as bad as a
#   green gate that does not mean "you don't" — people learn to ignore it.
#
# WHAT THIS DOES DIFFERENTLY
#   - A real finding fails IMMEDIATELY. There is no retry on advisories and no
#     path where a vulnerability produces exit 0. Retrying is scoped strictly
#     to recognised transport errors.
#   - Only transport errors are retried, with backoff.
#   - Exhausting the retries still FAILS, with a message that says the audit
#     could not be completed rather than pretending the tree is clean. We would
#     rather block on "unknown" than merge on a guess.
#
# DELIBERATELY NOT DONE
#   `|| true`, `continue-on-error`, and swallowing a non-zero exit are all
#   rejected: they convert this gate into decoration. If this script is failing
#   persistently, fix the finding or the network — do not soften the gate.
#
# USAGE
#   .github/scripts/pnpm-audit-gate.sh [--audit-level high]
#   Extra args are passed through to `pnpm audit`.
#
# REF: P13-E05 · CI recovery
set -uo pipefail

ATTEMPTS="${AUDIT_ATTEMPTS:-5}"
ARGS=("$@")
[ ${#ARGS[@]} -eq 0 ] && ARGS=(--audit-level=high)

# Transport-level failures. Matched against pnpm's stderr. Anything NOT in this
# list is treated as a genuine audit result and fails the build.
TRANSIENT='ERR_SOCKET_TIMEOUT|ERR_PNPM_META_FETCH_FAIL|Socket timeout|socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|FetchError|network timeout|502 Bad Gateway|503 Service|504 Gateway'

for attempt in $(seq 1 "$ATTEMPTS"); do
  out="$(pnpm audit "${ARGS[@]}" 2>&1)"
  code=$?

  if [ $code -eq 0 ]; then
    echo "$out"
    echo "pnpm-audit-gate: clean (attempt ${attempt})"
    exit 0
  fi

  if echo "$out" | grep -qE "$TRANSIENT"; then
    echo "pnpm-audit-gate: transport error on attempt ${attempt}/${ATTEMPTS}; retrying"
    echo "$out" | grep -E "$TRANSIENT" | head -3
    [ "$attempt" -lt "$ATTEMPTS" ] && sleep $((attempt * 15))
    continue
  fi

  # Not a transport error => pnpm has something to say about the tree.
  echo "$out"
  echo "pnpm-audit-gate: FAILED — advisories at or above the configured level."
  echo "Fix the dependency, or add a justified entry to the audit ignore list."
  exit 1
done

echo "pnpm-audit-gate: could not reach the npm advisory API after ${ATTEMPTS} attempts."
echo "Failing closed: the dependency tree was NOT verified. Re-run the job."
exit 1
