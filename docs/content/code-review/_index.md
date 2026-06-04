+++
title = "Code Review"
weight = 60
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Code Review Comments

This page aims to support common code review comments and feedback to open-mSupply code, and related projects.

As a code reviewer, we recommend you point to the explanations here when referring to a common code review feedback.
If you find yourself making a similar comment regularly add it here so we can improve our knowledge base and support new developers learning without repeating yourself too often.

See also:
- [Code Review Comments for Rust](@/code-review/rust/_index.md)
- [Code Review Comments for Typescript](@/code-review/typescript/_index.md)
- [Suggestion Snippets](@/code-review/snippets/_index.md)

## Remember PRs are for the reviewer
When working on code, it's common to think about what will be fast to write, what will make code faster, trying to optimise for future use cases, etc.
However when creating a PR it's important to think about the code reviewer's time, as well as people reading the code in the future.

When writing code keep in mind how the code will be reviewed and try to make sure the PR is focussed and easy to understand.
This might mean including screenshots of any UI changes to add context, breaking a PR up into smaller PRs to make reviewing easier, pulling unrelated changes into a separate PR, adding good test cases, and pointing out tricky edge cases in comments.

## Self review

Before submitting the PR, do a self review:
- Run the tests
- Run through the workflow + testing steps
- Review your code
  - Remove any commented code
  - Ensure naming is all up to date
  - Add review comments if more context is required for a certain change (or perhaps a code comment, if the context might not be apparent when someone comes back to this code in future!)

If part of the change was written with an AI assistant, the self-review bar is higher, not lower — see [Reviewing AI-assisted code](#reviewing-ai-assisted-code) below for the things to double-check before pushing.

## Reviewing AI-assisted code

AI assistants now author a meaningful share of the code we ship. The general code-review principles on this page still apply, but a few things shift when a human is reviewing AI-authored work (or reviewing their own changes that were drafted by an AI):

- **Plausible ≠ correct.** AI-generated code often reads naturally and uses real-looking APIs that don't actually exist, or uses them with the wrong arguments. Verify imports resolve, that functions called actually exist, and that the behaviour matches the issue — don't trust by reading.
- **Tests can codify the wrong behaviour.** AI is good at writing tests that pass, which is not the same as writing tests that prove the spec. When tests were drafted by an AI, read them as a reviewer would: do they test the *requirement*, or do they test what the implementation happens to do?
- **Scope creep.** AI tools often touch more than asked — renaming variables, "tidying" unrelated code, adding error handling for cases that can't happen. Treat any change outside the issue's scope the same way you would a human's unrelated fix: pull it into a separate PR, or remove it.
- **Be explicit when AI was used.** Mentioning in the PR description that AI assisted with a change (and what kind of assistance — "drafted by Claude", "Copilot autocomplete", "AI-generated tests") lets reviewers calibrate. It also makes the rest of this list cheaper to apply because reviewers know where to look.
- **Project conventions aren't free.** The Rust and Typescript pages below capture team preferences that AI assistants won't know unless told — `.to_string()` over `.to_owned()`, no `as` casts, no `packages/...` imports, etc. If you find yourself making the same correction to AI output repeatedly, capture it in `CLAUDE.md`/equivalent so the AI catches it next time.

## Prefer a simple solution over a complex one
Experienced Developers often argue for a simple solution rather than a complex and re-usable approach.
**Why?**
> Complex code is hard to read, debug and understand, which means it can take time to review, test and is more likely to contain errors.

We often end up with overly complex or complicated code when...
* Trying to anticipate future requirements that may never come
* Trying to optimise code performance
* Lack of experience with the code base, or time pressure

If one of these factors is encouraging you to choose a complex solution, it might be worth discussing your solution with another developer to get another brain on the task.

Obviously sometimes we need complex code, and some problems are inherently complex, it isn't always possible to simplify.

When using this comment, it should always come with a suggestion on how to simplify the code.

**Too Complex**
```
type stringTransformer {
     stringTransformerFunction: fn(s:string):string
}

fn uppercaser = (str:string, num_chars:number):string {
 let return_str = "";
 let i = 0;
 while(i < num_chars){
   return_str += str.charAt(i).toUpperCase();
 }
 return return_str + str.slice(i);
}

fn uppercaseFirstLetter(str:string): string{
   let transformFunction = stringTransformer{ stringTransformerFunction: uppercaser }

   return transformFunction.stringTransformerFunction(str, 1);
}
```

**Suggestion**

"It's unlikely we'll need to uppercase anything but the first character of the string so a simpler solution like this could be considered."
```
function uppercaseFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

> Note: Simplicity can be subjective, so take care when using this comment. Remember to respect other developers ideas and code, even if someone has gone about a change differently to what you might have, it doesn't mean it's bad or wrong.

See also: https://go.dev/talks/2015/simplicity-is-complicated.slide#11


## Should I make small unrelated `fixes` in my PR?

When working on an issue it's common to notice small things that could be fixed or improved along the way.
For example you might see a misspelling in a comment, or find that the one of the screens has a small UI bug that's easy to fix or improve.

Even though it's a lot more work to create an issue, and separate PR for these kinds of things, if in doubt we prefer to make these kinds of changes in a separate PR.

Obviously it can be a lot more work to create issues, PRs, and commits for small changes so there is a judgement call to be made here.

If the change is closely related to the issue you are working on, and doesn't obfuscate the core code changes then it's fine to make the change in the same PR, but if it's affecting multiple files, would require new test cases, it should almost certainly be done in a separate PR.

> Note: It should be considered acceptable for a reviewer to ask for unrelated changes to be moved to a separate PR, if they feel that it justifies it.

In the case that you have a change ready to go, it is sometimes ok to just raise PR with a suggested improvement or change without first creating an issue. However in most cases it's better to have an issue to allow prioritisation of that work against other things we could spend our time on.

For example imagine you are working on an issue which requires increasing MAX_SIZE to 1000 and you come across this code...

```
const MAX_SZIE: i32 = 100;

pub fn limted_add(a: i32, b: i32) -> i32 {
    let sum = a + b;
    if sum > MAX_SZIE{
        return MAX_SZIE; // If we add beyond the max size we coul dhave a buffer over
    }
    sum
}
```
In this case it would probably make sense to also fix the spelling of `MAX_SZIE` to `MAX_SIZE` and fix the typos in the comment as part of the issue.

However, if the constant `MAX_SZIE` was used in 100 files through our the project, it would be better to first rename the constant in separate PR, otherwise the key change of the size going from 100 to 1000 would be lost amongst the other changes in the code base.

## Nit's Don't need to be actioned
Comments are often prefixed with `nit:` this represents something a reviewer has noticed about the code, but doesn't think is important to enough to stop the code from being merged. Often used for spelling mistakes in comments for example.

Reviewers may want to commit changes fixing spelling errors to a review branch, rather than polluting the PR Comments with lots of spelling improvements. Obviously if the spelling correction isn't obvious, or might require associated code changes, a PR Comment might be more approriate.
