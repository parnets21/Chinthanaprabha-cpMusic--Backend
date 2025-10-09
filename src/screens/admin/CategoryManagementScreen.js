import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import * as ImagePicker from 'expo-image-picker';
import { categoryService } from '../../services/categoryService';
import { API_BASE_URL } from '../../config';

const CategoryManagementScreen = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subCategories: '',
    trending: false,
    image: null,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setFormData(prev => ({
        ...prev,
        image: result.assets[0]
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) {
      Alert.alert('Error', 'Name and description are required');
      return;
    }

    if (!formData.image && !editingCategory) {
      Alert.alert('Error', 'Image is required for new categories');
      return;
    }

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('subCategories', JSON.stringify(
        formData.subCategories.split(',').map(s => s.trim()).filter(Boolean)
      ));
      formDataToSend.append('trending', formData.trending.toString());

      if (formData.image) {
        formDataToSend.append('image', {
          uri: formData.image.uri,
          type: 'image/jpeg',
          name: 'category-image.jpg'
        });
      }

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory._id, formDataToSend);
        Alert.alert('Success', 'Category updated successfully');
      } else {
        await categoryService.createCategory(formDataToSend);
        Alert.alert('Success', 'Category created successfully');
      }

      resetForm();
      fetchCategories();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      subCategories: category.subCategories.join(', '),
      trending: category.trending,
      image: null,
    });
  };

  const handleDelete = async (categoryId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryService.deleteCategory(categoryId);
              Alert.alert('Success', 'Category deleted successfully');
              fetchCategories();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subCategories: '',
      trending: false,
      image: null,
    });
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F44336" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </Text>
        {editingCategory && (
          <TouchableOpacity onPress={resetForm} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="Category name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Category description"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sub Categories (comma separated)</Text>
          <TextInput
            style={styles.input}
            value={formData.subCategories}
            onChangeText={(text) => setFormData(prev => ({ ...prev, subCategories: text }))}
            placeholder="e.g., Electric, Acoustic, Bass"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Trending</Text>
          <Switch
            value={formData.trending}
            onValueChange={(value) => setFormData(prev => ({ ...prev, trending: value }))}
            trackColor={{ false: '#767577', true: '#F44336' }}
          />
        </View>

        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Icon name="image" size={24} color="#F44336" />
          <Text style={styles.imagePickerText}>
            {formData.image ? 'Change Image' : 'Select Image'}
          </Text>
        </TouchableOpacity>

        {formData.image && (
          <Image
            source={{ uri: formData.image.uri }}
            style={styles.previewImage}
          />
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {editingCategory ? 'Update Category' : 'Add Category'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.categoriesList}>
        <Text style={styles.sectionTitle}>Current Categories</Text>
        {categories.map((category) => (
          <View key={category._id} style={styles.categoryCard}>
            <Image
              source={{ uri: `${API_BASE_URL}${category.image}` }}
              style={styles.categoryImage}
            />
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
              {category.trending && (
                <View style={styles.trendingBadge}>
                  <Icon name="trending-up" size={12} color="#FFFFFF" />
                  <Text style={styles.trendingText}>Trending</Text>
                </View>
              )}
            </View>
            <View style={styles.categoryActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEdit(category)}
              >
                <Icon name="edit-2" size={20} color="#2196F3" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(category._id)}
              >
                <Icon name="trash-2" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 4,
    marginBottom: 16,
  },
  imagePickerText: {
    color: '#F44336',
    marginLeft: 8,
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 4,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#F44336',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
  },
  categoryImage: {
    width: '100%',
    height: 200,
  },
  categoryInfo: {
    padding: 16,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  trendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  categoryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default CategoryManagementScreen; 