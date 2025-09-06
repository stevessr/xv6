# Lab Guide: Submitting Your Work

This document provides the final steps for submitting your completed lab assignment via Gradescope.

---

## 1. Report Time Spent

You are asked to report the number of hours you spent on the lab. Create a file named `time.txt` in the root of your xv6 directory and place a single integer in it.

**Example Command:**
```bash
# This command creates the file and puts the number 10 in it.
# Replace 10 with the actual number of hours.
echo 10 > time.txt
```

Don't forget to add this file to your git repository:
```bash
git add time.txt
```

## 2. Run the Grading Script

Before submitting, ensure that your code passes all the tests. The `make grade` command runs the same tests that the Gradescope autograder will use.

**Command:**
```bash
make grade
```

Fix any errors or test failures before proceeding.

## 3. Commit Your Changes

Make sure all your modified source code and your new `time.txt` file are committed to your git repository.

**Command:**
```bash
# The -a flag commits all tracked files that have been modified.
# The -m flag provides a commit message.
git commit -am "Finish page table lab exercises"
```

## 4. Create the Submission Zip File

The `make zipball` command will create a `lab.zip` file containing your committed changes. This is the file you will upload.

**Command:**
```bash
make zipball
```

If you have uncommitted changes or untracked files (other than `time.txt` which you should have already added), the command will warn you. Make sure all necessary files for your solution are tracked by git.

## 5. Upload to Gradescope

Navigate to the course's Gradescope page, find the corresponding lab assignment, and upload your `lab.zip` file. The autograder will run, and the resulting score will be your grade for the lab.
