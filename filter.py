import pandas as pd

# Path to your CSV file
file_path = r"C:\Users\Arwin\Documents\Academic Files\4th Year\Integ Prog 2\Project Contribution Tracking System\ok-fines\src\environments\students.csv"

# Load the CSV file
df = pd.read_csv(file_path)

# Filter rows: keep only yearLevelID <= 4
df_filtered = df[df["yearLevelID"] <= 4]

# Save the filtered CSV (same folder or choose another path)
output_path = r"C:\Users\Arwin\Documents\Academic Files\4th Year\Integ Prog 2\Project Contribution Tracking System\ok-fines\src\environments\students_filtered.csv"
df_filtered.to_csv(output_path, index=False)

print("Rows with yearLevelID > 4 removed successfully!")
print(f"Original rows: {len(df)}")
print(f"Filtered rows: {len(df_filtered)}")
print(f"Saved as: {output_path}")
