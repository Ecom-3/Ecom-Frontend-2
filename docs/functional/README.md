# Application functional documentation

Baseline: local source reviewed on **20 October 2026**. Product: Pickles & Spices commerce application.

This pack describes the implemented application, including customer shopping, administration, store operations, delivery operations, and supporting services. It records disabled features and implementation inconsistencies rather than describing them as completed business capabilities.

## Reading order

| Document | Contents |
|---|---|
| [Customer features](customer.md) | Accounts, discovery, cart, addresses, profile, reviews, rewards, support and preferences |
| [Checkout, payments and orders](commerce.md) | Delivery selection, prices, checkout branches, payment restrictions, orders, documents and tracking |
| [Roles and permissions](roles.md) | Six account roles, module matrix, ownership and permission differences |
| [Administration](administration.md) | Every configured admin module, data entry, actions, scope and reporting |
| [Store and delivery operations](operations.md) | Store profile, delivery rules, partner management, assignment and delivery lifecycle |
| [Workflows and business rules](workflows.md) | Cross-role journeys, state transitions and business-rule register |
| [Business overview diagram](business-overview.mmd) | Customer, operations, administration and service relationships |
| [Integrations and data](integrations.md) | Service ownership, local persistence, configuration dependencies and errors |
| [Gaps and limitations](gaps.md) | Disabled, local, unreachable and inconsistent behavior |
| [Acceptance scenarios](acceptance.md) | Functional verification scenarios and execution status |
| [Coverage and source inventory](coverage.md) | All declared routes, nested admin modules, page files and service source inventory |
| [Backend endpoint inventory](backend-endpoints.md) | Controller mappings and authorization annotations for traceability |
| [Verification record](verification.md) | Checks performed on this documentation and available automated tests |

## Evidence and interpretation

- **Code-confirmed**: behavior is present in the inspected source. This is the default evidence level in the feature documents.
- **Backend-backed**: the UI calls a backend service for the action. It does not mean the configured deployment was exercised.
- **Local**: browser storage or in-memory state supplies the behavior; persistence and sharing differ from a server feature.
- **Disabled**: code explicitly prevents the action or the required server capability reports unavailable.
- **Unreachable/legacy**: code exists but has no corresponding current route or enabled module.
- **Runtime-verified**: reserved for workflows actually exercised against a running deployment. No authenticated business journey has this designation in this baseline.

The source inventory is exhaustive for declared routes and inventoried page files at generation time. Functional chapters cover those entry points and their significant actions. Backend endpoint inventory is a traceability appendix, not a claim that every infrastructure endpoint is exposed to users. External provider delivery, deployed configuration, account-specific permissions, and distributed transaction outcomes require runtime verification.

## Application overview

Customers discover products sold by stores, select a delivery location, build a cart, choose delivery or pickup, and place orders. Product identity includes the master product, optional variant, and supplying store. One shopping cart may contain groups that require different fulfillment.

The application distinguishes nearby-store delivery, store pickup, and India-wide global fulfillment. Local delivery uses store delivery rules. Global orders have a separate approval/assignment model. Orders, payment records, fulfillment records and shipments have separate lifecycles.

Administrative roles maintain catalog and operational data. Store Managers manage an assigned store and its delivery partners. Delivery Partners accept and progress assignments and use a customer OTP to complete delivery.

The application is a hybrid: catalog, authentication, profile, inventory and core order workflows call services; several customer engagement and admin features remain local. The chapters explicitly identify this boundary.

## Using and maintaining the pack

Feature IDs (`C`, `O`, `A`, `S`, `D`) connect chapters to acceptance scenarios. Source links are relative to this repository and its sibling backend. Regenerate the inventories with `python docs/functional/build_inventory.py` after routes or controllers change. Review the prose whenever business logic changes; generated inventories do not replace that review.

Keep credentials, tokens, customer records, and private environment values out of documentation. This pack references configuration names only.
