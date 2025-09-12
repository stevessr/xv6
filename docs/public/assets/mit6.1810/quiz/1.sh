#!/bin/bash

# Base URL for the quiz files, as indicated by the example
BASE_URL="https://pdos.csail.mit.edu/6.828/2025/"

# List of relative PDF paths extracted from the provided HTML
PDF_PATHS=(
    "quiz/q02_1_sol.pdf"
    "quiz/q03_1_sol.pdf"
    "quiz/q04_1_sol.pdf"
    "quiz/q05_1_sol.pdf"
    "quiz/q06_1_sol.pdf"
    "quiz/q07_1_sol.pdf"
    "quiz/q08_1_sol.pdf"
    "quiz/q08_1.pdf"
    "quiz/q09_1_sol.pdf"
    "quiz/q09_1.pdf"
    "quiz/q10_1_sol.pdf"
    "quiz/q10_1.pdf"
    "quiz/q11_1_sol.pdf"
    "quiz/q11_1.pdf"
    "quiz/q12_sol.pdf"
    "quiz/q12.pdf"
    "quiz/q14_1_sol.pdf"
    "quiz/q14_1.pdf"
    "quiz/q16_1_sol.pdf"
    "quiz/q16_1.pdf"
    "quiz/q17_1_sol.pdf"
    "quiz/q17_1.pdf"
    "quiz/q18_1_sol.pdf"
    "quiz/q18_1.pdf"
    "quiz/q19_1_sol.pdf"
    "quiz/q19_1.pdf"
    "quiz/q24-1-sol.pdf"
    "quiz/q24-1.pdf"
    "quiz/q02_2_sol.pdf"
    "quiz/q03_2_sol.pdf"
    "quiz/q04_2_sol.pdf"
    "quiz/q05_2_sol.pdf"
    "quiz/q06_2_sol.pdf"
    "quiz/q07_2_sol.pdf"
    "quiz/q08_2_sol.pdf"
    "quiz/q08_2.pdf"
    "quiz/q09_2_sol.pdf"
    "quiz/q09_2.pdf"
    "quiz/q10_2_sol.pdf"
    "quiz/q10_2.pdf"
    "quiz/q11_2_sol.pdf"
    "quiz/q11_2.pdf"
    "quiz/q14_2_sol.pdf"
    "quiz/q14_2.pdf"
    "quiz/q16_2_sol.pdf"
    "quiz/q16_2.pdf"
    "quiz/q17_2_sol.pdf"
    "quiz/q17_2.pdf"
    "quiz/q18_2_sol.pdf"
    "quiz/q18_2.pdf"
    "quiz/q19_2_sol.pdf"
    "quiz/q19_2.pdf"
    "quiz/q24-2-sol.pdf"
    "quiz/q24-2.pdf"
)

# Create a directory to store the quizzes, if it doesn't exist
mkdir -p quizzes

# Loop through each PDF path and generate a wget command
for path in "${PDF_PATHS[@]}"; do
    FULL_URL="${BASE_URL}${path}"
    echo "wget -P quizzes \"${FULL_URL}\""
done

echo ""
echo "To download all files, copy the output above into your terminal, or save it to a .sh file and run it."
echo "For example: ./download_quizzes.sh > download.sh && bash download.sh"
