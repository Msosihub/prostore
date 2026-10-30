# Discovery hydration investigation

A prior PostgreSQL17 adapter browser run logged one React production error418 during discovery while assertions passed. The old handler printed the message without the URL and did not fail. There is insufficient evidence to assign a component/root cause.

Discovery now records the current URL for page errors and rejects hydration/hydrating/#418/#425 messages at scenario completion. It retains all original search, Back, malformed-query, pagination and mobile layout assertions. The browser harness supports a fixed allowlist of selected scenario names so a suspected issue can be repeated without weakening assertions; logs identify the selected scenarios rather than claiming a full suite ran.

Executed on disposable PostgreSQL17.11 with real browser/Next server, test-only Prisma adapter/fonts and blocked external calls:

- One focused discovery run passed without hydration errors.
- A second full optimized fixture build followed by storefront-seo, credibility and three discovery repetitions passed without hydration errors.
- Both owned servers/databases were cleaned up. No production access, credential changes or denied download retries.

No application rendering fix is claimed. Four clean discovery executions do not disprove the original intermittent warning. The original full15-workflow log remains /tmp/legacy-review-browser17-final.log. Investigation logs: /tmp/discovery-hydration.log and /tmp/discovery-hydration-repeat.log. Synthetic diagnostic copies: /tmp/prostore-browser-WOQ1Tx and /tmp/prostore-browser-PCsUJn. Future recurrence should now fail and identify the URL; capture a development-mode React component diff in an isolated reproduction before selecting a code change. Do not suppressHydrationWarning to hide an unexplained mismatch. Native Prisma17 and actual production adoption gates remain unchanged.
