---
title: "Tesseract, an OCR (Optical Character Recognition) tool for Image Reading from Excel"
description: "Here is a detailed, step-by-step guide on how to extract text from images in an Excel sheet using Tesseract, an OCR (Optical Character Recognition) tool,"
routeSlug: "tesseract-an-ocr-optical-character-recognition-tool-for-image-reading-from-excel"
canonical: "https://www.aiamigos.org/tesseract-an-ocr-optical-character-recognition-tool-for-image-reading-from-excel/"
publishedAt: "2024-08-04"
category: "tools-and-models"
audience: "professional"
author: "AI Amigos Editorial Desk"
status: "published"
disposition: "retain"
originalUrl: "https://www.aiamigos.org/tesseract-an-ocr-optical-character-recognition-tool-for-image-reading-from-excel/"
sources: ["https://www.aiamigos.org/tesseract-an-ocr-optical-character-recognition-tool-for-image-reading-from-excel/"]
limitations: ["Imported from a public snapshot; claims require editorial verification before substantive update."]
tags: ["Blog"]
---
<p>Here is a detailed, step-by-step guide on how to extract text from images in an Excel sheet using <strong>Tesseract</strong>, an OCR (Optical Character Recognition) tool, along with Python. The process assumes no prior knowledge, so I&#8217;ll walk through every step, from installing Tesseract to writing a Python script that extracts text from images embedded in the Excel sheet.</p>







<h3>Step 1: Install Required Tools and Libraries</h3>



<h4>1.1 Install Tesseract OCR</h4>



<p>Tesseract is an open-source OCR engine that can extract text from images. First, you need to install it on your system.</p>



<ul>
<li><strong>Windows</strong>:
<ul>
<li>Download the Tesseract installer from <a href="https://github.com/UB-Mannheim/tesseract/wiki" target="_blank" rel="noopener">here</a>.</li>



<li>Run the installer and follow the prompts.</li>



<li>During installation, make sure to check the box that adds Tesseract to your system&#8217;s PATH. This makes it easier to use in Python.</li>
</ul>
</li>



<li><strong>Linux</strong>: You can install Tesseract via the terminal:bashCopy code<code>sudo apt-get update sudo apt-get install tesseract-ocr</code></li>



<li><strong>Mac</strong>: Use <code>Homebrew</code> to install Tesseract:bashCopy code<code>brew install tesseract</code></li>
</ul>



<h4>1.2 Install Python Libraries</h4>



<p>You&#8217;ll need some Python libraries for reading the Excel file, processing the images, and extracting text. You can install all of them at once using <code>pip</code>:</p>



<p>bash</p>



<p><code>pip install openpyxl Pillow pytesseract</code></p>



<ul>
<li><strong><code>openpyxl</code></strong>: For reading Excel files and extracting embedded images.</li>



<li><strong><code>Pillow</code></strong>: For image processing (this is a Python imaging library).</li>



<li><strong><code>pytesseract</code></strong>: A Python wrapper for Tesseract to perform OCR on the images.</li>
</ul>



<hr/>



<h3>Step 2: Set Up Tesseract in Python</h3>



<p>Once you have Tesseract installed, you need to point Python to the Tesseract executable so it can use it for OCR. This can be done by specifying the path where Tesseract is installed.</p>



<ul>
<li><strong>Windows</strong>: If Tesseract was added to PATH during installation, Python should automatically find it. If not, you need to provide the path:pythonCopy code<code>import pytesseract # Specify the path to the Tesseract executable pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'</code></li>



<li><strong>Linux/Mac</strong>: Tesseract is usually available globally after installation, so you don&#8217;t need to specify a path unless it&#8217;s installed in a custom location.</li>
</ul>



<hr/>



<h3>Step 3: Extract Images from Excel Sheet</h3>



<p>Now that we have Tesseract set up, the next step is to extract the images embedded in your Excel sheet. We&#8217;ll use the <code>openpyxl</code> library for this.</p>



<p>Here’s how you can extract images from an Excel file:</p>



<ol>
<li>Open the Excel file using <code>openpyxl</code>.</li>



<li>Loop through the worksheet to find and save embedded images.</li>
</ol>



<p>python</p>



<p><code>from openpyxl import load_workbook from openpyxl.drawing.image import Image # Load the Excel workbook wb = load_workbook('your_excel_file.xlsx') # Select the active sheet (you can change this if necessary) sheet = wb.active # Iterate over the images in the sheet for idx, img in enumerate(sheet._images): # Save the image locally img_name = f'image_{idx}.png' img.image.save(img_name) print(f"Image saved as {img_name}")</code></p>



<p>This code saves all the embedded images from the Excel file as PNG files in your working directory.</p>



<hr/>



<h3>Step 4: Use Tesseract to Perform OCR on Extracted Images</h3>



<p>After extracting the images from the Excel sheet, we can now use Tesseract to perform OCR and extract text from these images.</p>



<p>python</p>



<p><code>from PIL import Image as PILImage import pytesseract # Example: Load the saved image and perform OCR img_name = 'image_0.png' # Replace with the actual image file name # Open the image using Pillow img = PILImage.open(img_name) # Perform OCR on the image using Tesseract extracted_text = pytesseract.image_to_string(img) # Output the extracted text print("Extracted Text:") print(extracted_text)</code></p>



<p>This code opens an image, runs Tesseract on it to extract the text, and prints the extracted text.</p>



<hr/>



<h3>Step 5: Putting It All Together</h3>



<p>Here’s a complete Python script that does the following:</p>



<ol>
<li>Extracts all images embedded in an Excel sheet.</li>



<li>Applies Tesseract OCR to each image to extract text.</li>



<li>Outputs the extracted text for each image.</li>
</ol>



<p>python</p>



<p><code>from openpyxl import load_workbook from openpyxl.drawing.image import Image as OpenpyxlImage from PIL import Image as PILImage import pytesseract import os # Ensure Tesseract path is correctly set up (only required for Windows) # Uncomment and change the path below to your Tesseract installation if needed: # pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe' # Step 1: Load the Excel workbook workbook_path = 'your_excel_file.xlsx' wb = load_workbook(workbook_path) sheet = wb.active # You can specify a different sheet if needed # Step 2: Iterate over the images in the Excel sheet if not sheet._images: print("No images found in the Excel sheet.") else: # Create a directory to store the images if not os.path.exists('extracted_images'): os.makedirs('extracted_images') for idx, img in enumerate(sheet._images): # Save each image locally img_name = f"extracted_images/image_{idx}.png" img.image.save(img_name) print(f"Image {idx} saved as {img_name}") # Step 3: Open the saved image using Pillow with PILImage.open(img_name) as img_file: # Step 4: Perform OCR on the image using Tesseract extracted_text = pytesseract.image_to_string(img_file) # Step 5: Output the extracted text print(f"Extracted Text from Image {idx}:") print(extracted_text) print("-" * 50) # Separator between images print("Image extraction and OCR process completed.")</code></p>



<h3>Explanation of the Code:</h3>



<ol>
<li><strong>Loading the Excel File</strong>:
<ul>
<li>The script opens the Excel file using <code>openpyxl</code> and selects the active sheet.</li>



<li>You can change the <code>sheet = wb.active</code> line to load a different sheet if needed by specifying the sheet name (e.g., <code>sheet = wb['Sheet2']</code>).</li>
</ul>
</li>



<li><strong>Extracting Images</strong>:
<ul>
<li>The script loops over all images embedded in the worksheet (<code>sheet._images</code>) and saves each image as a PNG file in a folder called <code>extracted_images</code>.</li>



<li>Each image is saved with a unique name (e.g., <code>image_0.png</code>, <code>image_1.png</code>, etc.).</li>
</ul>
</li>



<li><strong>Applying OCR to Each Image</strong>:
<ul>
<li>After saving each image, the script opens the image using the <code>Pillow</code> library and applies Tesseract OCR (<code>pytesseract.image_to_string(img_file)</code>) to extract any text present in the image.</li>



<li>The extracted text is printed to the console for review.</li>
</ul>
</li>



<li><strong>Output and Clean-Up</strong>:
<ul>
<li>If no images are found in the Excel sheet, the script outputs a message stating that no images were found.</li>



<li>A separator line (<code>"-" * 50</code>) is printed after the extracted text of each image to make the output clearer.</li>
</ul>
</li>
</ol>



<hr/>



<h3>Step 6: Running the Script</h3>



<ol>
<li><strong>Save the Script</strong>: Copy the Python script into a file, e.g., <code>extract_text_from_images.py</code>.</li>



<li><strong>Run the Script</strong>: Use a terminal or command prompt to run the script:bashCopy code<code>python extract_text_from_images.py</code></li>



<li><strong>Check the Output</strong>:
<ul>
<li>The extracted images will be saved in the <code>extracted_images</code> folder.</li>



<li>The extracted text from each image will be printed to the terminal/console.</li>
</ul>
</li>
</ol>



<hr/>



<h3>Step 7: Fine-tuning and Troubleshooting</h3>



<h4>7.1 Improve OCR Accuracy</h4>



<p>OCR accuracy can vary depending on the quality of the image and the text in it. Here are some tips to improve accuracy:</p>



<ul>
<li><strong>Image Preprocessing</strong>:<ul><li>You can preprocess the image to improve OCR accuracy, for example, by converting it to grayscale or increasing the contrast.</li></ul>Example of converting an image to grayscale:pythonCopy code<code>gray_img = img_file.convert('L') # Convert to grayscale extracted_text = pytesseract.image_to_string(gray_img)</code></li>



<li><strong>Language Specification</strong>:<ul><li>If the text in the images is in a different language, you can specify the language for Tesseract:</li></ul>pythonCopy code<code>extracted_text = pytesseract.image_to_string(img_file, lang='eng') # 'eng' is for English</code></li>
</ul>



<h4>7.2 Debugging Common Errors</h4>



<ul>
<li><strong>Tesseract not found</strong>: If Tesseract isn&#8217;t properly installed or if Python can&#8217;t find it, make sure the path to the Tesseract executable is correctly set using:pythonCopy code<code>pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe' </code>Ensure Tesseract is installed in the specified path.</li>



<li><strong>Low OCR Accuracy</strong>:
<ul>
<li>If the OCR results are poor, you may need to clean or preprocess the images, increase resolution, or check that Tesseract is trained on the correct language.</li>
</ul>
</li>
</ul>



<hr/>



<h3>Step 8: Automating the Workflow</h3>



<p>To scale the workflow:</p>



<ul>
<li>You can run this script on multiple Excel files by modifying the input path to process each Excel file in a directory.</li>



<li>Automate the process to run regularly if you&#8217;re frequently receiving new Excel files containing embedded images.</li>
</ul>



<hr/>



<h3>Conclusion</h3>



<p>Using <strong>Tesseract OCR</strong> with Python, you can automate the extraction of text from images embedded in Excel files. The step-by-step guide walks you through installing the necessary tools, extracting images from Excel sheets, and performing OCR to convert image-based text into machine-readable format. With this setup, you can now process large Excel documents with embedded images and use the extracted text in your production environment.</p>

<div class="evidence"><strong>Editorial provenance.</strong> Imported from the public snapshot. Original publication date: 2024-08-04. This article remains subject to source, authorship, and factual review before its next substantive update.</div>
