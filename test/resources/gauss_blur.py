import numpy as np
from scipy.ndimage import gaussian_filter

# Input texture (5x5)
input_texture = np.array([
	[0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0],
	[0, 0, 255, 0, 0],
	[0, 0, 0, 0, 0],
	[0, 0, 0, 0, 0]
], dtype=np.float32)

# Parameters for Gaussian blur
radius = 2
sigma = radius/3

# Apply Gaussian blur using scipy
output_texture = gaussian_filter(
  input_texture,
  sigma=sigma,
  mode='constant',
  cval=0.0,
  radius=radius
)

# Print the resulting texture
np.set_printoptions(precision=1, suppress=True)
print("Output Texture:")
print(output_texture)
